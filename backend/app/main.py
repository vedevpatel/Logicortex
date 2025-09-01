from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.db.base_class import Base

# Import all models to ensure they are registered with SQLAlchemy
from app.db.models import user, organization 

# Import the new routers
from app.api.endpoints import auth, oauth, organizations

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Logicortex API",
    description="The backend service for the Logicortex autonomous security platform.",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
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

# Include all routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(oauth.router, prefix="/api/v1/auth", tags=["oauth"])
app.include_router(organizations.router, prefix="/api/v1/organizations", tags=["organizations"])