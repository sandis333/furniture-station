import psutil
import subprocess
import os
import platform

my_pid = os.getpid()
card_reader_markers = (
    "card_reader.py",
    "cardreader_repo",
    "/card_reader/",
    "\\card_reader\\",
)

# Kill Chrome based on OS
if platform.system() == "Windows":
    subprocess.call("TASKKILL /f  /IM  CHROME.EXE", shell=True)
else:  # Linux/Unix
    try:
        subprocess.call(["pkill", "-9", "-f", "chromium"])  # Raspberry Pi uses Chromium
        subprocess.call(["pkill", "-9", "-f", "chrome"])  # In case Google Chrome is installed
    except Exception as e:
        print(f"Could not kill browser: {e}")

# Nokilo visus pythonus iznemot šo
for proc in psutil.process_iter():
    try:
        if 'python' in proc.name().lower():
            if int(proc.pid) != int(my_pid):
                command = " ".join(proc.cmdline()).lower()
                if any(marker in command for marker in card_reader_markers):
                    print(f'Skipped card reader process {proc.pid}')
                    continue
                proc.kill()
                print(f'Killed process {proc.pid}')
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass
