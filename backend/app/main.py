from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database tables are created
    await init_db()
    yield
    # Shutdown: clean up resources if needed

app = FastAPI(
    title="RoadSight API",
    description="Real-Time Road Hazard & Pothole Detection Backend Service",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for phone camera testing and deployment over HTTPS / ngrok
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "Welcome to RoadSight API",
        "docs": "/docs",
        "health": "/api/health"
    }
