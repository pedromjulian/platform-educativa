from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .api import auth, courses, materials, assignments, grading

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

@app.get("/")
def read_root():
    return {"message": "Platform API is running"}
