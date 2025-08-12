from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from config.db import db
import json
import asyncio

landslide_router = APIRouter()

# MongoDB collection for landslide data
landslide_collection = db.landslide_server

# Store active connections
esp32_connections: List[WebSocket] = []
frontend_connections: List[WebSocket] = []

# Helper: serialize MongoDB document
def serialize_doc(doc):
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    if "timestamp" in doc and isinstance(doc["timestamp"], datetime):
        doc["timestamp"] = doc["timestamp"].isoformat()
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
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
  # ESP32 WebSocket handler - UPDATED to include feet data
@landslide_router.websocket("/ws")
async def esp32_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    esp32_connections.append(websocket)
    print("?? ESP32 Landslide connected via WebSocket")

    try:
        while True:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                
                try:
                    data = json.loads(message)
                    print(f"?? Received from ESP32 Landslide: {data}")
                except json.JSONDecodeError:
                    print(f"? Invalid JSON from ESP32: {message}")
                    continue

                # Handle different message types
                if data.get("type") == "ping":
                    # Respond to ping
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue
                
                if data.get("type") == "status":
                    print(f"?? ESP32 Status: {data}")
                    continue

                # Handle sensor data
                if data.get("type") == "sensor" or data.get("servo1") is not None:
                    # Save landslide sensor data to database WITH FEET DATA
                    document = {
                        "timestamp": datetime.utcnow(),
                        "created_at": datetime.utcnow(),
                        "type": "sensor",
                        "servo1": data.get("servo1", 1),
                        "servo2": data.get("servo2", 1),
                        "accel_x": data.get("accel_x", 0),
                        "accel_y": data.get("accel_y", 0),
                        "accel_z": data.get("accel_z", 0),
                        "drop_ft": data.get("drop_ft", 0),  # ?? ADD THIS LINE
                        "sensor_height_ft": data.get("sensor_height_ft", 10.0),  # ?? ADD THIS LINE
                        "status": data.get("status", "normal")
                    }
                    result = landslide_collection.insert_one(document)
                    document["_id"] = result.inserted_id

                    print(f"?? Saved landslide data to DB with drop: {data.get('drop_ft', 0)} ft")

                    # Broadcast to all frontend clients
                    serialized_data = serialize_doc(document.copy())
                    await broadcast_to_frontend(serialized_data)

            except asyncio.TimeoutError:
                # Send ping to check if connection is alive
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                    print("?? Sent ping to ESP32")
                except:
                    print("? Failed to send ping to ESP32")
                    break

    except WebSocketDisconnect:
        print("?? ESP32 Landslide WebSocket disconnected normally")
    except Exception as e:
        print(f"? ESP32 Landslide WebSocket error: {e}")
    finally:
        if websocket in esp32_connections:
            esp32_connections.remove(websocket)
        print("?? Cleaned up ESP32 connection")
        

# Frontend WebSocket handler
@landslide_router.websocket("/ws/frontend")
async def frontend_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    frontend_connections.append(websocket)
    print("?? Frontend Landslide client connected via WebSocket")

    try:
        # Send latest data immediately upon connection
        latest_doc = landslide_collection.find_one(
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
        print("?? Frontend Landslide WebSocket disconnected")
    except Exception as e:
        print(f"? Frontend Landslide WebSocket error: {e}")
        if websocket in frontend_connections:
            frontend_connections.remove(websocket)

# Get all landslide data
@landslide_router.get("/all")
async def get_all_landslide_data():
    try:
        docs = list(landslide_collection.find({"type": "sensor"}).sort("timestamp", -1).limit(50))
        serialized_docs = [serialize_doc(doc) for doc in docs]
        return {"status": "success", "data": serialized_docs}
    except Exception as e:
        print(f"? Error fetching landslide data: {e}")
        return {"status": "error", "message": "Failed to fetch landslide data"}
# Get latest landslide data
@landslide_router.get("/latest")
async def get_latest_landslide_data():
    try:
        latest_doc = landslide_collection.find_one(
            {"type": "sensor"}, 
            sort=[("timestamp", -1)]
        )
        if latest_doc:
            return {"status": "success", "data": serialize_doc(latest_doc)}
        return {"status": "no_data", "message": "No landslide sensor data found"}
    except Exception as e:
        print(f"? Error fetching latest landslide data: {e}")
        return {"status": "error", "message": "Failed to fetch latest data"}

# Servo control endpoints
@landslide_router.post("/servo/{servo_number}/{action}")
async def control_servo(servo_number: int, action: str):
    if servo_number not in [1, 2]:
        return {"status": "error", "message": "Invalid servo number. Use 1 or 2."}
    
    if action not in ["on", "off"]:
        return {"status": "error", "message": "Invalid action. Use 'on' or 'off'."}
    
    command = {
        "command": f"SERVO_{servo_number}_{action.upper()}",
        "servo": servo_number,
        "action": action
    }
    
    await send_command_to_esp32(command)
    
    # Log command
    control_doc = {
        "timestamp": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "type": "control",
        "servo_number": servo_number,
        "action": action.upper(),
        "source": "API"
    }
    landslide_collection.insert_one(control_doc)
    
    # Notify frontend clients about the command
    await broadcast_to_frontend({
        "type": "control",
        "servo_number": servo_number,
        "action": action.upper(),
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"status": "success", "message": f"Servo {servo_number} {action.upper()} command sent"}

# Helper: Send command to ESP32
async def send_command_to_esp32(command: dict):
    if esp32_connections:
        disconnected = []
        for conn in esp32_connections:
            try:
                await conn.send_text(json.dumps(command))
                print(f"?? Command sent to ESP32 Landslide: {command}")
            except Exception as e:
                print(f"? Failed to send command to ESP32: {e}")
                disconnected.append(conn)
        
        # Remove disconnected ESP32s
        for conn in disconnected:
            if conn in esp32_connections:
                esp32_connections.remove(conn)
    else:
        print("? No ESP32 Landslide connected")
        
# Get connection status
@landslide_router.get("/status")
async def get_connection_status():
    return {
        "esp32_connections": len(esp32_connections),
        "frontend_connections": len(frontend_connections),
        "total_connections": len(esp32_connections) + len(frontend_connections),
        "service": "Landslide Monitoring"
    }
        
