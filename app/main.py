import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api_service import ApiService
from .config import config
from .http_client import ApiError
from .matrix_processor import MatrixProcessor
from .models import (
    BrowserArticleRequest,
    BrowserCancelSessionRequest,
    BrowserOrderRequest,
    BrowserStartSessionRequest,
    AuthStatus,
    CardStatusUpdate,
    ScannerStatus,
)
from .serial_scanner import SerialScanner
from .websocket_manager import WebSocketManager


@asynccontextmanager
async def lifespan(_: FastAPI):
    scanner_task = asyncio.create_task(
        scanner.start_scanning(handle_scanner_data, handle_scanner_status)
    )
    try:
        yield
    finally:
        scanner.stop_scanning()
        scanner_task.cancel()
        try:
            await scanner_task
        except asyncio.CancelledError:
            pass
        finally:
            await api_service.close()


app = FastAPI(
    title="Sakomplektētās furnitūras izņemšanas stacija",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

websocket_manager = WebSocketManager()
api_service = ApiService()
scanner = SerialScanner()
processor = MatrixProcessor(api_service)
current_scanner_status = {"status": 0, "message": "GAIDA SAVIENOJUMU"}
current_auth_status = AuthStatus().model_dump()


async def set_auth_status(auth_status: AuthStatus):
    global current_auth_status
    current_auth_status = auth_status.model_dump()
    if auth_status.status and auth_status.code:
        api_service.set_card(auth_status.code)
    else:
        api_service.clear_card()
    await websocket_manager.send_auth_status(auth_status)


def require_authorized_card():
    if not current_auth_status["status"] or not current_auth_status["code"]:
        raise ApiError(403, current_auth_status["message"])


@app.exception_handler(ApiError)
async def api_error_handler(_, error: ApiError):
    if error.status_code in (401, 403):
        await set_auth_status(
            AuthStatus(
                message=error.message,
                reason="authorization_error",
            )
        )
    return JSONResponse(
        status_code=error.status_code if error.status_code else 502,
        content={"status": "0", "message": error.message},
    )


async def handle_scanner_data(data: str):
    if not current_auth_status["status"]:
        return
    await processor.process_matrix(data, websocket_manager.send_terminal_update)


async def handle_scanner_status(status: int):
    global current_scanner_status
    messages = {
        0: "GAIDA SAVIENOJUMU",
        1: "SAVIENOTS",
        2: "KĻŪDA SAVIENOJUMĀ",
    }
    scanner_status = ScannerStatus(
        status=status,
        message=messages.get(status, "IEKŠĒJA KĻŪDA"),
    )
    current_scanner_status = scanner_status.model_dump()
    await websocket_manager.send_scanner_status(scanner_status)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    await websocket_manager.send_initial_state(
        websocket,
        current_scanner_status,
        current_auth_status,
    )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "scanner_connected": scanner.is_connected(),
        "station_id": config.STATION_ID,
        "authorized": current_auth_status["status"],
    }


@app.get("/api/auth-status")
async def auth_status():
    return current_auth_status


@app.post("/api/update-card-status")
async def update_card_status(data: CardStatusUpdate, request: Request):
    client_host = request.client.host if request.client else ""
    if client_host not in ("127.0.0.1", "::1"):
        return JSONResponse(
            status_code=403,
            content={"success": False, "message": "Atļauti tikai lokāli pieprasījumi"},
        )
    if str(data.station_id) != str(config.STATION_ID):
        return JSONResponse(
            status_code=403,
            content={"success": False, "message": "Neatbilstošs stacijas ID"},
        )

    authorized = data.status == 1 and data.card_id is not None
    await set_auth_status(
        AuthStatus(
            status=authorized,
            code=data.card_id if authorized else None,
            username=data.username if authorized else None,
            message=(
                data.message
                or (
                    f"Autorizēts: {data.username}"
                    if authorized and data.username
                    else (
                        "Lietotājs autorizēts"
                        if authorized
                        else "Novietojiet kartiņu uz lasītāja"
                    )
                )
            ),
            reason=data.reason or ("authorized" if authorized else "waiting"),
        )
    )
    return {"success": True, "authorized": authorized}


@app.get("/api/workflow")
async def workflow_state():
    require_authorized_card()
    return (await api_service.get_session_state()).model_dump()


@app.get("/api/orders")
async def orders(order_type: str):
    require_authorized_card()
    normalized_order_type = order_type.strip().upper()
    if normalized_order_type not in ("MBK", "KPA"):
        raise ApiError(400, "Nav norādīts derīgs MBK/KPA tips")
    return (await api_service.get_orders(normalized_order_type)).model_dump()


@app.post("/api/articles")
async def articles(data: BrowserOrderRequest):
    require_authorized_card()
    response = await api_service.get_articles(data.order_type, data.order_number)
    return response.model_dump()


@app.post("/api/options")
async def options(data: BrowserArticleRequest):
    require_authorized_card()
    response = await api_service.get_options(
        data.order_type,
        data.order_number,
        data.article,
    )
    return response.model_dump()


@app.post("/api/start-session")
async def start_session(data: BrowserStartSessionRequest):
    require_authorized_card()
    response = await api_service.start_session(
        data.order_type,
        data.order_number,
        data.article,
        data.selected_kids,
    )
    return response.model_dump()


@app.post("/api/cancel-session")
async def cancel_session(data: BrowserCancelSessionRequest):
    require_authorized_card()
    return (await api_service.cancel_session(data.session_id)).model_dump()


app.mount("/static", StaticFiles(directory="static"), name="static-files")
app.mount("/", StaticFiles(directory="static", html=True), name="frontend")
