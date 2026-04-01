from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import matches, notifications, offers, ratings, saved_listings, trades
from app.routes.chats import router as chats_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sparkling-pithivier-0fd65c.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(ratings.router)
app.include_router(trades.router)


app.include_router(chats_router)
app.include_router(offers.router)
app.include_router(saved_listings.router)
