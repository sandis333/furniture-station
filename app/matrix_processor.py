from typing import Callable
from .api_service import ApiService
from .models import TerminalUpdate



class MatrixProcessor:
    def __init__(self, api_service: ApiService):
        self.api_service = api_service

    async def process_matrix(
        self,
        data: str,
        update_callback: Callable[[TerminalUpdate], None],
    ):
        scan_data = data.strip()
        if not scan_data:
            return

        print(f"Processing KID scan: {scan_data}")
        try:
            response = await self.api_service.process_scan(scan_data)
            message_type = "SUCCESS" if response.status in ("1", "2") else "ERROR"
            await update_callback(
                TerminalUpdate(
                    matrix=response.matrix,
                    message=response.message,
                    message_type=message_type,
                    status=response.status,
                    session=response.session,
                )
            )
        except Exception as error:
            print(f"Error processing KID scan: {error}")
            message = "NEVAR SAVIENOTIES AR SERVERI"
            if "Connection" not in str(error) and "HTTP 0" not in str(error):
                message = "KĻŪDA APSTRĀDĀJOT SKENĒJUMU"
            await update_callback(
                TerminalUpdate(
                    matrix=scan_data,
                    message=message,
                    message_type="ERROR",
                    status="0",
                )
            )
