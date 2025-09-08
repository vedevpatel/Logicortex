from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.db.models import Base 
from app.api.endpoints import auth, oauth, organizations, github, users, scans
from app.api.endpoints import remediation
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
app.include_router(github.router, prefix="/api/v1/github", tags=["github"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(scans.router, prefix="/api/v1/scans", tags=["scans"])
app.include_router(remediation.router, prefix="/api/v1/remediation", tags=["remediation"])