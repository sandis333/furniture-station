import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
    BASE_URL = os.getenv("BASE_URL", "")
    AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
    STATION_ID = os.getenv("STATION_ID", "")

    if not BASE_URL:
        raise ValueError("BASE_URL environment variable is required")
    if not AUTH_TOKEN:
        raise ValueError("AUTH_TOKEN environment variable is required")
    if not STATION_ID:
        raise ValueError("STATION_ID environment variable is required")


config = Config()
