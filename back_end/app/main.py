from fastapi import FastAPI
from app.routes import matches,notifications, ratings, trades

app = FastAPI()


app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(ratings.router)
app.include_router(trades.router)