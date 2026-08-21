from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, settings
from .api import auth, courses, materials, assignments, grading, quizzes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(materials.router)
app.include_router(assignments.router)
app.include_router(grading.router)
app.include_router(quizzes.router)

@app.get("/")
def read_root():
    return {"message": "Platform API is running"}

@app.get("/_debug_config")
def debug_config():
    return {
        "secret_key_len": len(settings.SECRET_KEY),
        "secret_key_prefix": settings.SECRET_KEY[:4],
        "secret_key_suffix": settings.SECRET_KEY[-4:],
        "algorithm": settings.ALGORITHM,
        "is_default_secret": settings.SECRET_KEY == "dev-secret-key-change-in-production",
    }
