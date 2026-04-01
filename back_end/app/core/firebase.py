import json
import os

import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

if not firebase_admin._apps:
    # Use env var on Render, fall back to local file for development
    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
    else:
        BASE_DIR = Path(__file__).resolve().parents[2]
        KEY_PATH = BASE_DIR / "serviceAccountKey.json"
        cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()