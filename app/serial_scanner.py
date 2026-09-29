import serial
import serial.tools.list_ports
import asyncio
from typing import Optional

from .config import config


class SerialScanner:
    def __init__(self, port: str = None, baud_rate: int = 9600):
        self.port_name = port or config.SERIAL_PORT
        self.baud_rate = baud_rate
        self.connection: Optional[serial.Serial] = None
        self.is_running = False

    def connect(self) -> bool:
        try:
            if self.connection and self.connection.is_open:
                self.connection.close()

            self.connection = serial.Serial(
                port=self.port_name, baudrate=self.baud_rate, timeout=1.0
            )
            print(f"Successfully connected to {self.port_name}")
            return True
        except Exception as e:
            print(f"Failed to connect to {self.port_name}: {e}")
            return False

    def disconnect(self):
        if self.connection and self.connection.is_open:
            self.connection.close()
        self.connection = None

    def reconnect(self) -> bool:
        self.disconnect()
        return self.connect()

    def is_connected(self) -> bool:
        if self.connection is None:
            return False

        # Check if connection is still open and functional
        try:
            # First check if port still exists in system
            available_ports = [
                port.device for port in serial.tools.list_ports.comports()
            ]
            if self.port_name not in available_ports:
                print(f"Port {self.port_name} no longer exists in system")
                self.disconnect()
                return False

            # Try to get port status - this will fail if device is disconnected
            if hasattr(self.connection, "is_open") and not self.connection.is_open:
                return False

            # More aggressive check: try to access port properties
            _ = self.connection.in_waiting
            _ = self.connection.out_waiting

            # Try to get port settings (this often fails when device is disconnected)
            _ = self.connection.baudrate
            _ = self.connection.timeout

            return True
        except Exception as e:
            # If any exception occurs, connection is broken
            print(f"Connection check failed: {e}")
            self.disconnect()
            return False

    async def read_data(self) -> Optional[str]:
        if not self.is_connected():
            return None

        try:
            if self.connection.in_waiting > 0:
                data = self.connection.read(self.connection.in_waiting)
                return data.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            print(f"Read error (device may be disconnected): {e}")
            # Connection error occurred, likely device disconnected
            self.disconnect()
            raise e
        return None

    async def start_scanning(self, data_handler, status_handler):
        self.is_running = True
        connection_status_sent = False
        last_health_check = 0

        while self.is_running:
            current_time = asyncio.get_event_loop().time()

            # Periodic health check every 1 second
            if current_time - last_health_check > 1.0:
                if not self.is_connected():
                    print("Health check failed - device disconnected")
                    await status_handler(0)  # Waiting for connection
                    connection_status_sent = False
                last_health_check = current_time

            if not self.is_connected():
                if self.connect():
                    await status_handler(1)  # Connected
                    connection_status_sent = True
                else:
                    await status_handler(0)  # Waiting for connection
                    connection_status_sent = False
                    await asyncio.sleep(1)
                    continue

            try:
                # Send connected status if we haven't already
                if not connection_status_sent:
                    print("Sending connected status")
                    await status_handler(1)  # Connected
                    connection_status_sent = True

                data = await self.read_data()
                if data:
                    print(f"Received data: {data}")
                    await data_handler(data)
                else:
                    await asyncio.sleep(0.1)

            except Exception as e:
                print(f"Scanner error: {e}")
                await status_handler(2)  # Connection error
                connection_status_sent = False
                if not self.reconnect():
                    await status_handler(0)  # Waiting for connection
                await asyncio.sleep(1)

    def stop_scanning(self):
        self.is_running = False
        self.disconnect()
