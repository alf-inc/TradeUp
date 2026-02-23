from fastapi import FastAPI
from app.routes import matches

app = FastAPI()
app.include_router(matches.router)