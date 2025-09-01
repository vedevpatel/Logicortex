from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import db and models
from app.db.session import engine
from app.db.base_class import Base
from app.db.models import user # Ensure the user model is imported

# Import the new router
from app.api.endpoints import auth

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Create FastAPI app instance
app = FastAPI(
    title="Logicortex API",
    description="The backend service for the Logicortex autonomous security platform.",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # Allow all origins for now, can be restricted later
    allow_origins=["*"],
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

# Include the auth router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])