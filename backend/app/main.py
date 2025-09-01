from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app instance
app = FastAPI(
    title="Logicortex API",
    description="The backend service for the Logicortex autonomous security platform.",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows the frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    """
    Root endpoint to check if the service is running.
    """
    return {"status": "ok", "message": "Welcome to the Logicortex Backend!"}

# API routers
# from .api.endpoints import analysis
# app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])