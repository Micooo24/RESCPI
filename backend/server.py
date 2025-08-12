from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Any

from routes.landslide_router import landslide_router
from routes.flood_router import router as flood_router
from routes.gasfire_router import gasfire_router
from routes.rescue_router import rescue_router

app = FastAPI(
    title="RESCPI - Disaster Management System",
    description="Real-time disaster monitoring and emergency response system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
origins = [
    "*",
    "http://10.16.180.221:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (like FastAPI structure you wanted)
app.include_router(landslide_router, prefix="/landslide", tags=["Landslide Monitoring"])
app.include_router(flood_router, prefix="/flood", tags=["Flood Monitoring"])
app.include_router(gasfire_router, prefix="/gasfire", tags=["Gas & Fire Monitoring"])
app.include_router(rescue_router, prefix="/rescue", tags=["Rescue Vehicle"])


# Pydantic models for request/response
class GeneralDataRequest(BaseModel):
    message: str

class GeneralDataResponse(BaseModel):
    status: str
    message: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    system: str

@app.get("/")
def index():
    return {
        "service": "RESCPI - Disaster Management System",
        "status": "Running",
        "available_modules": {
            "landslide": "/landslide",
            "flood": "/flood",
            "general": "/data"
        },
        "version": "1.0.0"
    }

@app.post("/data", response_model=GeneralDataResponse)
async def receive_data(data: GeneralDataRequest):
    """General data endpoint (original functionality)"""
    print("?? Message from ESP32:", data.message)
    return GeneralDataResponse(status="received", message=data.message)

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        system="RESCPI Backend"
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
