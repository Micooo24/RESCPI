from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from datetime import datetime
import pytz
from config.db import db
from bson import ObjectId
from typing import List, Optional
import json
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gasfire_router = APIRouter()

# Singapore timezone
SGT = pytz.timezone('Asia/Singapore')

# MongoDB collection for gas fire data
gasfire_collection = db.gasfire

# Store active connections with metadata
esp32_connections: List[dict] = []
frontend_connections: List[dict] = []

class GasFireData(BaseModel):
    mq2_ppm: float
    mq7_ppm: float
    flame: bool
    timestamp: Optional[datetime] = None

# Helper: Get current Singapore time
def get_singapore_time():
    return datetime.now(SGT)

# Helper: Convert UTC to Singapore time
def convert_to_singapore_time(utc_time):
    if isinstance(utc_time, datetime):
        if utc_time.tzinfo is None:
            utc_time = pytz.UTC.localize(utc_time)
        return utc_time.astimezone(SGT)
    return utc_time
# Helper: serialize MongoDB document with Singapore timezone
def serialize_doc(doc):
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    
    # Convert timestamps to Singapore time
    if "timestamp" in doc and isinstance(doc["timestamp"], datetime):
        if doc["timestamp"].tzinfo is None:
            doc["timestamp"] = pytz.UTC.localize(doc["timestamp"])
        doc["timestamp"] = doc["timestamp"].astimezone(SGT).isoformat()
    
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        if doc["created_at"].tzinfo is None:
            doc["created_at"] = pytz.UTC.localize(doc["created_at"])
        doc["created_at"] = doc["created_at"].astimezone(SGT).isoformat()
    
    return doc

# Helper: Broadcast data to all frontend clients
async def broadcast_to_frontend(data: dict):
    """Send data to all connected frontend clients"""
    if frontend_connections:
        disconnected = []
        for conn_info in frontend_connections:
            try:
                await conn_info["websocket"].send_text(json.dumps(data))
                conn_info["last_activity"] = get_singapore_time()
            except Exception as e:
                logger.error(f"? Failed to send to frontend: {e}")
                disconnected.append(conn_info)
        
        # Remove disconnected clients
        for conn_info in disconnected:
            if conn_info in frontend_connections:
                frontend_connections.remove(conn_info)
                logger.info(f"?? Removed disconnected frontend client")

# Helper: Get connection statistics
def get_connection_stats():
    singapore_time = get_singapore_time()
    
    active_esp32 = []
    active_frontend = []
    
    # Check ESP32 connections
    for conn_info in esp32_connections:
        time_diff = (singapore_time - conn_info["last_activity"]).total_seconds()
        if time_diff < 120:  # Active if last activity within 2 minutes
            active_esp32.append({
                "id": conn_info["id"],
                "connected_at": conn_info["connected_at"].isoformat(),
                "last_activity": conn_info["last_activity"].isoformat(),
                "device": conn_info.get("device", "Unknown")
            })
    
    # Check frontend connections
    for conn_info in frontend_connections:
        time_diff = (singapore_time - conn_info["last_activity"]).total_seconds()
        if time_diff < 120:
            active_frontend.append({
                "id": conn_info["id"],
                "connected_at": conn_info["connected_at"].isoformat(),
                "last_activity": conn_info["last_activity"].isoformat()
            })
    
    return {
        "esp32_connections": len(active_esp32),
        "frontend_connections": len(active_frontend),
        "total_connections": len(active_esp32) + len(active_frontend),
        "active_esp32": active_esp32,
        "active_frontend": active_frontend
    }
    
# ESP32 WebSocket handler
@gasfire_router.websocket("/ws")
async def esp32_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    
    singapore_time = get_singapore_time()
    connection_id = f"esp32_{int(singapore_time.timestamp())}"
    
    conn_info = {
        "id": connection_id,
        "websocket": websocket,
        "connected_at": singapore_time,
        "last_activity": singapore_time,
        "device": "ESP32_GasFire",
        "type": "esp32"
    }
    
    esp32_connections.append(conn_info)
    logger.info(f"?? ESP32 Gas/Fire connected via WebSocket (ID: {connection_id})")

    try:
        while True:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                conn_info["last_activity"] = get_singapore_time()
                
                try:
                    data = json.loads(message)
                    logger.info(f"?? Received from ESP32 Gas/Fire: {data}")
                except json.JSONDecodeError:
                    logger.error(f"? Invalid JSON from ESP32: {message}")
                    continue

                # Update device info
                if data.get("device"):
                    conn_info["device"] = data.get("device")

                # Handle different message types
                if data.get("type") == "ping":
                    # Respond to ping
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": get_singapore_time().isoformat()
                    }))
                    continue
                
                if data.get("type") == "status":
                    logger.info(f"?? ESP32 Status: {data}")
                    # Broadcast status to frontend
                    await broadcast_to_frontend({
                        "type": "esp32_status",
                        "data": data,
                        "timestamp": get_singapore_time().isoformat()
                    })
                    continue
                # Handle sensor data
                if data.get("type") == "sensor" or data.get("mq2_ppm") is not None:
                    singapore_time = get_singapore_time()
                    
                    # Document with sensor data only
                    document = {
                        "timestamp": singapore_time,
                        "created_at": singapore_time,
                        "type": "sensor",
                        "device": data.get("device", "ESP32_GasFire"),
                        "connection_id": connection_id,
                        "mq2_ppm": float(data.get("mq2_ppm", 0)),
                        "mq7_ppm": float(data.get("mq7_ppm", 0)),
                        "flame": bool(data.get("flame", False)),
                        "status": data.get("status", "normal"),
                        "alerts": data.get("alerts", {
                            "mq2_alert": False,
                            "mq7_alert": False,
                            "fire_alert": False
                        }),
                        "wifi_rssi": data.get("wifi_rssi"),
                        "uptime_ms": data.get("uptime_ms")
                    }
                    
                    result = gasfire_collection.insert_one(document)
                    document["_id"] = result.inserted_id

                    logger.info(f"?? Saved gas/fire data (SGT: {singapore_time.strftime('%H:%M:%S')}) - MQ2:{document['mq2_ppm']:.1f} MQ7:{document['mq7_ppm']:.1f} Fire:{document['flame']}")

                    # Broadcast to all frontend clients
                    serialized_data = serialize_doc(document.copy())
                    await broadcast_to_frontend(serialized_data)

            except asyncio.TimeoutError:
                # Send ping to check if connection is alive
                try:
                    await websocket.send_text(json.dumps({
                        "type": "ping",
                        "timestamp": get_singapore_time().isoformat()
                    }))
                    logger.info("?? Sent ping to ESP32 Gas/Fire")
                except:
                    logger.error("? Failed to send ping to ESP32")
                    break

    except WebSocketDisconnect:
        logger.info("?? ESP32 Gas/Fire WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"? ESP32 Gas/Fire WebSocket error: {e}")
    finally:
        if conn_info in esp32_connections:
            esp32_connections.remove(conn_info)
        logger.info(f"?? Cleaned up ESP32 Gas/Fire connection (ID: {connection_id})")
        
@gasfire_router.websocket("/ws/frontend")
async def frontend_websocket_handler(websocket: WebSocket):
    await websocket.accept()
    
    singapore_time = get_singapore_time()
    connection_id = f"frontend_{int(singapore_time.timestamp())}"
    
    conn_info = {
        "id": connection_id,
        "websocket": websocket,
        "connected_at": singapore_time,
        "last_activity": singapore_time,
        "type": "frontend"
    }
    
    frontend_connections.append(conn_info)
    logger.info(f"??? Frontend Gas/Fire client connected via WebSocket (ID: {connection_id})")

    try:
        # Send latest data immediately upon connection
        latest_doc = gasfire_collection.find_one(
            {"type": "sensor"}, 
            sort=[("timestamp", -1)]
        )
        if latest_doc:
            await websocket.send_text(json.dumps(serialize_doc(latest_doc)))
            logger.info("?? Sent latest data to new frontend client")

        # Send connection statistics
        stats = get_connection_stats()
        await websocket.send_text(json.dumps({
            "type": "connection_stats",
            "data": stats,
            "timestamp": get_singapore_time().isoformat()
        }))

        # Keep connection alive and handle messages
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                conn_info["last_activity"] = get_singapore_time()
                
                data = json.loads(message)
                
                # Handle ping messages
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": get_singapore_time().isoformat()
                    }))
                    
            except asyncio.TimeoutError:
                # Send ping to check if connection is alive
                await websocket.send_text(json.dumps({
                    "type": "ping",
                    "timestamp": get_singapore_time().isoformat()
                }))
            except json.JSONDecodeError:
                logger.error("? Invalid JSON from frontend")
            
    except WebSocketDisconnect:
        if conn_info in frontend_connections:
            frontend_connections.remove(conn_info)
        logger.info(f"?? Frontend Gas/Fire WebSocket disconnected (ID: {connection_id})")
    except Exception as e:
        logger.error(f"? Frontend Gas/Fire WebSocket error: {e}")
        if conn_info in frontend_connections:
            frontend_connections.remove(conn_info)
# REST API endpoints

@gasfire_router.get("/all")
async def get_all_gas_fire():
    """Get all gas fire data with pagination and filtering"""
    try:
        docs = list(gasfire_collection.find({"type": "sensor"}).sort("timestamp", -1).limit(100))
        serialized_docs = [serialize_doc(doc) for doc in docs]
        
        # Calculate statistics
        if docs:
            mq2_values = [doc.get("mq2_ppm", 0) for doc in docs]
            mq7_values = [doc.get("mq7_ppm", 0) for doc in docs]
            fire_incidents = sum(1 for doc in docs if doc.get("flame", False))
            
            stats = {
                "total_readings": len(docs),
                "fire_incidents": fire_incidents,
                "max_mq2": max(mq2_values) if mq2_values else 0,
                "max_mq7": max(mq7_values) if mq7_values else 0,
                "avg_mq2": sum(mq2_values) / len(mq2_values) if mq2_values else 0,
                "avg_mq7": sum(mq7_values) / len(mq7_values) if mq7_values else 0
            }
        else:
            stats = {}
        
        return {
            "status": "success", 
            "data": serialized_docs,
            "statistics": stats,
            "connections": get_connection_stats()
        }
    except Exception as e:
        logger.error(f"? Error fetching gas fire data: {e}")
        return {"status": "error", "message": "Failed to fetch gas fire data"}
        
 
@gasfire_router.get("/latest")
async def get_latest_gas_fire():
    """Get latest gas fire data with enhanced metadata"""
    try:
        latest_doc = gasfire_collection.find_one(
            {"type": "sensor"}, 
            sort=[("timestamp", -1)]
        )
        if latest_doc:
            return {
                "status": "success", 
                "data": serialize_doc(latest_doc),
                "connections": get_connection_stats(),
                "server_time_sgt": get_singapore_time().isoformat()
            }
        return {"status": "no_data", "message": "No gas fire sensor data found"}
    except Exception as e:
        logger.error(f"? Error fetching latest gas fire data: {e}")
        return {"status": "error", "message": "Failed to fetch latest data"}
        
@gasfire_router.get("/status")
async def get_connection_status():
    """Get comprehensive system status"""
    try:
        # Get latest sensor data
        latest_doc = gasfire_collection.find_one(
            {"type": "sensor"}, 
            sort=[("timestamp", -1)]
        )
        
        # Get recent statistics
        recent_docs = list(gasfire_collection.find(
            {"type": "sensor", "timestamp": {"$gte": get_singapore_time().replace(hour=0, minute=0, second=0)}}
        ).sort("timestamp", -1))
        
        daily_stats = {}
        if recent_docs:
            mq2_values = [doc.get("mq2_ppm", 0) for doc in recent_docs]
            mq7_values = [doc.get("mq7_ppm", 0) for doc in recent_docs]
            fire_incidents = sum(1 for doc in recent_docs if doc.get("flame", False))
            
            daily_stats = {
                "readings_today": len(recent_docs),
                "fire_incidents_today": fire_incidents,
                "max_mq2_today": max(mq2_values) if mq2_values else 0,
                "max_mq7_today": max(mq7_values) if mq7_values else 0
            }
        
        status_data = {
            **get_connection_stats(),
            "service": "Gas & Fire Monitoring System",
            "server_time_sgt": get_singapore_time().isoformat(),
            "latest_reading": serialize_doc(latest_doc) if latest_doc else None,
            "daily_statistics": daily_stats,
            "system_status": "operational" if esp32_connections else "no_devices"
        }
        
        return status_data
        
    except Exception as e:
        logger.error(f"? Error getting status: {e}")
        return {"status": "error", "message": str(e)}

@gasfire_router.post("/data")
async def save_gas_fire_data_legacy(data: GasFireData):
    """Legacy HTTP POST endpoint"""
    try:
        singapore_time = get_singapore_time()
        
        # Determine status based on readings
        status = "normal"
        if data.flame:
            status = "fire_detected"
        elif data.mq2_ppm > 200 and data.mq7_ppm > 100:
            status = "critical_gas"
        elif data.mq2_ppm > 200 or data.mq7_ppm > 100:
            status = "gas_alert"
        
        # Save to database
        document = {
            "timestamp": data.timestamp or singapore_time,
            "created_at": singapore_time,
            "type": "sensor",
            "device": "HTTP_CLIENT",
            "mq2_ppm": float(data.mq2_ppm),
            "mq7_ppm": float(data.mq7_ppm),
            "flame": bool(data.flame),
            "status": status,
            "source": "HTTP_POST"
        }
        
        result = gasfire_collection.insert_one(document)
        document["_id"] = result.inserted_id
        
        logger.info(f"?? Legacy data saved (SGT: {singapore_time.strftime('%H:%M:%S')}): MQ2:{data.mq2_ppm} MQ7:{data.mq7_ppm} Fire:{data.flame}")
        
        # Broadcast to frontend clients
        await broadcast_to_frontend(serialize_doc(document.copy()))
        
        return {"status": "success", "message": "Data saved successfully", "id": str(result.inserted_id)}
        
    except Exception as e:
        logger.error(f"? Error saving legacy data: {e}")
        return {"status": "error", "message": str(e)}
