import json
from typing import List, Dict, Any

from fastapi import WebSocket

from .models import AuthStatus, ScannerStatus, TerminalUpdate


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_to_all(self, message: Dict[str, Any]):
        if not self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.append(connection)

        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    async def send_scanner_status(self, status: ScannerStatus):
        await self.send_to_all({"type": "scanner_status", "data": status.model_dump()})

    async def send_terminal_update(self, update: TerminalUpdate):
        await self.send_to_all({"type": "terminal_update", "data": update.model_dump()})

    async def send_auth_status(self, status: AuthStatus):
        await self.send_to_all({"type": "auth_status", "data": status.model_dump()})

    async def send_initial_state(
        self,
        websocket: WebSocket,
        current_scanner_status=None,
        current_auth_status=None,
    ):
        try:
            # Use provided scanner status or default
            scanner_status = current_scanner_status or {
                "status": 0,
                "message": "GAIDA SAVIENOJUMU",
            }
            auth_status = current_auth_status or AuthStatus().model_dump()

            await websocket.send_text(
                json.dumps(
                    {
                        "type": "initial_state",
                        "data": {
                            "scanner_status": scanner_status,
                            "auth_status": auth_status,
                            "terminal_update": {
                                "matrix": None,
                                "message": None,
                                "message_type": "INFO",
                                "status": "0",
                                "session": None,
                            },
                        },
                    }
                )
            )
        except Exception:
            pass
