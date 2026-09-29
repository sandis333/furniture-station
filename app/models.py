from typing import List, Optional

from pydantic import BaseModel, Field


class ScannerStatus(BaseModel):
    status: int
    message: str


class CardStatusUpdate(BaseModel):
    station_id: str
    status: int
    username: Optional[str] = None
    card_id: Optional[int] = None
    message: Optional[str] = None
    reason: Optional[str] = None


class AuthStatus(BaseModel):
    status: bool = False
    code: Optional[int] = None
    username: Optional[str] = None
    message: str = "Novietojiet kartiņu uz lasītāja"
    reason: str = "waiting"


class StationRequest(BaseModel):
    station_id: str
    card_id: int


class OrdersRequest(StationRequest):
    order_type: str


class OrderRequest(StationRequest):
    order_type: str
    order_number: str


class ArticleRequest(OrderRequest):
    article: str


class StartSessionRequest(ArticleRequest):
    selected_kids: List[int]


class ProcessScanRequest(StationRequest):
    scan_data: str


class CancelSessionRequest(StationRequest):
    session_id: Optional[str] = None


class OrderItem(BaseModel):
    order_type: str
    order_number: str


class ArticleItem(BaseModel):
    article: str
    requested_count: int
    extracted_count: int
    remaining_count: int


class ContainerItem(BaseModel):
    kid: int
    kit_count: int
    cabinet: str = ""
    shelf: str = ""
    scanned: bool = False


class ExtractionOption(BaseModel):
    kit_count: int
    kids: List[ContainerItem] = Field(default_factory=list)


class SessionKidItem(BaseModel):
    kid: int
    cabinet: str = ""
    shelf: str = ""
    scanned: bool = False


class SelectionSummary(BaseModel):
    order_type: str
    order_number: str
    article: str
    requested_count: int
    extracted_count: int
    remaining_count: int
    available_count: int
    options: List[ExtractionOption] = Field(default_factory=list)
    containers: List[ContainerItem] = Field(default_factory=list)


class SessionData(BaseModel):
    session_id: str
    station_id: int
    user_id: Optional[int] = None
    order_type: str
    order_number: str
    article: str
    requested_count: int
    extracted_count: int
    selected_count: int
    scanned_count: int = 0
    status: str
    order_complete: bool = False
    kids: List[SessionKidItem] = Field(default_factory=list)
    remaining_kids: List[SessionKidItem] = Field(default_factory=list)


class OrdersResponse(BaseModel):
    status: str
    message: str = ""
    data: List[OrderItem] = Field(default_factory=list)
    active_session: Optional[SessionData] = None


class ArticlesResponse(BaseModel):
    status: str
    message: str = ""
    data: List[ArticleItem] = Field(default_factory=list)


class OptionsResponse(BaseModel):
    status: str
    message: str = ""
    data: SelectionSummary


class SessionResponse(BaseModel):
    status: str
    message: str = ""
    session: Optional[SessionData] = None


class ProcessScanResponse(SessionResponse):
    matrix: str = ""


class TerminalUpdate(BaseModel):
    matrix: Optional[str] = None
    message: Optional[str] = None
    message_type: str = "INFO"
    status: str = "0"
    session: Optional[SessionData] = None


class BrowserOrderRequest(BaseModel):
    order_type: str
    order_number: str


class BrowserArticleRequest(BrowserOrderRequest):
    article: str


class BrowserStartSessionRequest(BrowserArticleRequest):
    selected_kids: List[int]


class BrowserCancelSessionRequest(BaseModel):
    session_id: Optional[str] = None
