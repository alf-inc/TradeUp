from fastapi import FastAPI
from app.routes import matches,notifications

app = FastAPI()
app.include_router(matches.router)
app.include_router(notifications.router)