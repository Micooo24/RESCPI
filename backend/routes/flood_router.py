from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from config.db import db
import json
import asyncio

router = APIRouter()

# MongoDB collection
flood_collection = db.flood_server

# Store active connections
esp32_connections: List[WebSocket] = []
frontend_connections: List[WebSocket] = []

# Helper: serialize MongoDB document
def serialize_doc(doc):
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    if "timestamp" in doc and isinstance(doc["timestamp"], datetime):
        doc["timestamp"] = doc["timestamp"].isoformat()
    return doc

# Helper: Broadcast data to all frontend clients
async def broadcast_to_frontend(data: dict):
    """Send data to all connected frontend clients"""
    if frontend_connections:
        disconnected = []
        for conn in frontend_connections:
            try:
                await conn.send_text(json.dumps(data))
            except Exception as e:
                print(f"? Failed to send to frontend: {e}")
                disconnected.append(conn)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in frontend_connections:
                frontend_connections.remove(conn)

# ESP32 WebSocket handler
@router.websocket("/ws")
async def esp32_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    esp32_connections.append(websocket)
    print("?? ESP32 connected via WebSocket")

    try:
        while True:
            message = await websocket.receive_text()
            try:
                data = json.loads(message)
                print(f"?? Received from ESP32: {data}")
            except json.JSONDecodeError:
                print("? Received invalid JSON from ESP32")
                continue

            # Skip ping messages
            if data.get("type") == "ping":
                continue

            # Save sensor data to database
            document = {
                "timestamp": datetime.utcnow(),
                "type": "sensor",
                "distance": data.get("distance"),
                "liters": data.get("liters"),
                "pump": data.get("pump", "OFF"),
                "mode": data.get("mode", "AUTO")
            }
            result = flood_collection.insert_one(document)
            document["_id"] = result.inserted_id

            print(f"?? Saved to DB: {document}")

            # Broadcast to all frontend clients
            serialized_data = serialize_doc(document.copy())
            await broadcast_to_frontend(serialized_data)

    except WebSocketDisconnect:
        if websocket in esp32_connections:
            esp32_connections.remove(websocket)
        print("?? ESP32 WebSocket disconnected")
    except Exception as e:
        print(f"? ESP32 WebSocket error: {e}")
        if websocket in esp32_connections:
            esp32_connections.remove(websocket)

# Frontend WebSocket handler
@router.websocket("/ws/frontend")
async def frontend_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    frontend_connections.append(websocket)
    print("?? Frontend client connected via WebSocket")

    try:
        # Send latest data immediately upon connection - FIXED SYNTAX
        latest_doc = flood_collection.find_one(
            {"type": "sensor"}, 
            sort=[("timestamp", -1)]
        )
        if latest_doc:
            await websocket.send_text(json.dumps(serialize_doc(latest_doc)))

        # Keep connection alive and handle messages
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                data = json.loads(message)
                 # Handle ping messages
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except asyncio.TimeoutError:
                # Send ping to check if connection is alive
                await websocket.send_text(json.dumps({"type": "ping"}))
            except json.JSONDecodeError:
                print("? Invalid JSON from frontend")

    except WebSocketDisconnect:
        if websocket in frontend_connections:
            frontend_connections.remove(websocket)
        print("?? Frontend WebSocket disconnected")
    except Exception as e:
        print(f"? Frontend WebSocket error: {e}")
        if websocket in frontend_connections:
            frontend_connections.remove(websocket)

@router.get("/latest")
async def get_latest_flood_data():
    # FIXED SYNTAX - separate the filter and sort parameters
    latest_doc = flood_collection.find_one(
        {"type": "sensor"}, 
        sort=[("timestamp", -1)]
    )
    if latest_doc:
        return {"status": "success", "data": serialize_doc(latest_doc)}
    return {"status": "no_data", "message": "No sensor data found"}

@router.post("/control/on")
async def turn_pump_on():
    await send_command_to_esp32({"command": "PUMP_ON"})
    # Log command
    control_doc = {
        "timestamp": datetime.utcnow(),
        "type": "control",
        "action": "ON",
        "source": "API"
    }
    flood_collection.insert_one(control_doc)
    
    # Notify frontend clients about the command
    await broadcast_to_frontend({
        "type": "control",
        "action": "PUMP_ON",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"status": "success", "message": "Pump ON command sent"}

@router.post("/control/off")
async def turn_pump_off():
    await send_command_to_esp32({"command": "PUMP_OFF"})
    # Log command
    control_doc = {
        "timestamp": datetime.utcnow(),
        "type": "control",
        "action": "OFF",
         "source": "API"
    }
    flood_collection.insert_one(control_doc)
    
    # Notify frontend clients about the command
    await broadcast_to_frontend({
        "type": "control",
        "action": "PUMP_OFF",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"status": "success", "message": "Pump OFF command sent"}

# Helper: Send command to ESP32
async def send_command_to_esp32(command: dict):
    if esp32_connections:
        disconnected = []
        for conn in esp32_connections:
            try:
                await conn.send_text(json.dumps(command))
                print(f"?? Command sent to ESP32: {command}")
            except Exception as e:
                print(f"? Failed to send command to ESP32: {e}")
                disconnected.append(conn)
        
        # Remove disconnected ESP32s
        for conn in disconnected:
            if conn in esp32_connections:
                esp32_connections.remove(conn)
    else:
        print("? No ESP32 connected")

# Get connection status
@router.get("/status")
async def get_connection_status():
    return {
        "esp32_connections": len(esp32_connections),
        "frontend_connections": len(frontend_connections),
        "total_connections": len(esp32_connections) + len(frontend_connections)
    }
        
                
            
