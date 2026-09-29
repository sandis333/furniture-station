from .config import config
from .http_client import ApiError, HttpClient
from .models import (
    ArticleRequest,
    ArticlesResponse,
    CancelSessionRequest,
    OptionsResponse,
    OrderRequest,
    OrdersRequest,
    OrdersResponse,
    ProcessScanRequest,
    ProcessScanResponse,
    SessionResponse,
    StartSessionRequest,
    StationRequest,
)


class ApiService:
    def __init__(self):
        self.client = HttpClient()
        self.card_id: int | None = None

    def set_card(self, card_id: int):
        self.card_id = card_id

    def clear_card(self):
        self.card_id = None

    def _card_id(self) -> int:
        if self.card_id is None:
            raise ApiError(403, "Nav aktīvas darbinieka kartiņas")
        return self.card_id

    async def close(self):
        await self.client.close()

    async def get_orders(self, order_type: str):
        request_data = OrdersRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
            order_type=order_type,
        )
        return await self.client.post("orders", request_data, OrdersResponse)

    async def get_articles(self, order_type: str, order_number: str):
        request_data = OrderRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
            order_type=order_type,
            order_number=order_number,
        )
        return await self.client.post("articles", request_data, ArticlesResponse)

    async def get_options(self, order_type: str, order_number: str, article: str):
        request_data = ArticleRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
            order_type=order_type,
            order_number=order_number,
            article=article,
        )
        return await self.client.post("options", request_data, OptionsResponse)

    async def start_session(
        self,
        order_type: str,
        order_number: str,
        article: str,
        selected_kids: list[int],
    ):
        request_data = StartSessionRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
            order_type=order_type,
            order_number=order_number,
            article=article,
            selected_kids=selected_kids,
        )
        return await self.client.post("start-session", request_data, SessionResponse)

    async def get_session_state(self):
        request_data = StationRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
        )
        return await self.client.post("session-state", request_data, SessionResponse)

    async def process_scan(self, scan_data: str):
        request_data = ProcessScanRequest(
            scan_data=scan_data,
            station_id=config.STATION_ID,
            card_id=self._card_id(),
        )
        return await self.client.post("process-scan", request_data, ProcessScanResponse)

    async def cancel_session(self, session_id: str | None = None):
        request_data = CancelSessionRequest(
            station_id=config.STATION_ID,
            card_id=self._card_id(),
            session_id=session_id,
        )
        return await self.client.post("cancel-session", request_data, SessionResponse)
