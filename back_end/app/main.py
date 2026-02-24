from fastapi import FastAPI
from app.routes import matches, ratings

app = FastAPI()
app.include_router(matches.router)
app.include_router(ratings.router)
