from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from typing import List, Optional

rescue_router = APIRouter()

# Store connected ESP32 sockets
esp32_connections: List[WebSocket] = []

# Store latest GPS location
latest_gps: Optional[dict] = None

# Store connected frontend sockets for GPS live tracking
frontend_connections: List[WebSocket] = []


# ===== WebSocket endpoint for ESP32 =====
@rescue_router.websocket("/ws")
async def rescue_ws(websocket: WebSocket):
    global latest_gps
    await websocket.accept()
    esp32_connections.append(websocket)
    print("? ESP32 Rescue connected")

    try:
        while True:
            msg = await websocket.receive_text()
            print(f"?? From ESP32 Rescue: {msg}")

            # Try to parse GPS JSON from ESP32
            try:
                data = json.loads(msg)
                if "lat" in data and "lng" in data:
                    latest_gps = data
                    # Broadcast to all frontend clients
                    for conn in frontend_connections:
                        await conn.send_text(json.dumps({
                            "type": "gps_update",
                            "lat": latest_gps["lat"],
                            "lng": latest_gps["lng"],
                            "sat": latest_gps.get("sat", None)
                        }))
            except json.JSONDecodeError:
                pass  # Not GPS data, just ignore
    except WebSocketDisconnect:
        esp32_connections.remove(websocket)
        print("? ESP32 Rescue disconnected")


# ===== WebSocket endpoint for Frontend =====
@rescue_router.websocket("/ws/frontend")
async def frontend_ws(websocket: WebSocket):
    await websocket.accept()
    frontend_connections.append(websocket)
    print("? Frontend connected for GPS tracking")

    try:
        while True:
            await websocket.receive_text()  # Just keep alive
    except WebSocketDisconnect:
        frontend_connections.remove(websocket)
        print("? Frontend disconnected")


# ===== Helper to send command to ESP32 =====
async def send_command_to_esp32(command: str, duration: float):
    if not esp32_connections:
        return {"status": "error", "message": "No ESP32 connected"}
    payload = {"cmd": command, "duration": duration}
    for conn in esp32_connections:
        await conn.send_text(json.dumps(payload))
    return {"status": "success", "message": f"Command '{command}' sent"}


# ===== Rescue Commands =====
@rescue_router.post("/landslide/on")
async def landslide_on():
    return await send_command_to_esp32("LANDSLIDE", 0.5)

@rescue_router.post("/flood/on")
async def flood_on():
    return await send_command_to_esp32("FLOOD", 1.5)

@rescue_router.post("/fire/on")
async def fire_on():
    return await send_command_to_esp32("FIRE", 1.0)

@rescue_router.post("/off")
async def stop_all():
    return await send_command_to_esp32("STOP_RESCUE", 0)


# ===== GPS Endpoints =====
@rescue_router.get("/gps/latest")
async def get_latest_gps():
    if latest_gps:
        return {"status": "success", "gps": latest_gps}
    return {"status": "error", "message": "No GPS data received yet"}
