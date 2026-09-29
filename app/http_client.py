import httpx
from pydantic import BaseModel
from typing import TypeVar, Type

from .config import config

T = TypeVar("T", bound=BaseModel)


class ApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"HTTP {status_code}: {message}")


class HttpClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0, headers={"Authorization": f"Bearer {config.AUTH_TOKEN}"}
        )
        self.base_url = config.BASE_URL.rstrip("/")

    async def close(self):
        await self.client.aclose()

    def _build_url(self, endpoint: str) -> str:
        return f"{self.base_url}/{endpoint.lstrip('/')}"

    @staticmethod
    def _error_message(response: httpx.Response) -> str:
        try:
            payload = response.json()
            if isinstance(payload, dict) and payload.get("message"):
                return str(payload["message"])
        except ValueError:
            pass
        return response.text or "Lācis API neatgrieza kļūdas aprakstu"

    async def post(self, endpoint: str, data: BaseModel, response_model: Type[T]) -> T:
        url = self._build_url(endpoint)
        try:
            response = await self.client.post(url, json=data.model_dump())
            if response.status_code in [200, 201]:
                return response_model(**response.json())
            else:
                raise ApiError(response.status_code, self._error_message(response))
        except httpx.RequestError as e:
            raise ApiError(0, str(e))
