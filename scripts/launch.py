"""Start the local app from Finder, reusing healthy servers when possible."""

import argparse
import json
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:5173/"


def ready(kind):
    url = "http://127.0.0.1:8000/openapi.json" if kind == "API" else URL
    try:
        with urlopen(url, timeout=1) as response:
            body = response.read().decode()
        if kind == "API":
            return json.loads(body).get("info", {}).get("title") == "Polaris API"
        return "Polaris | Northwest Passage" in body
    except (URLError, OSError, ValueError):
        return False


def port_busy(port):
    with socket.socket() as connection:
        connection.settimeout(1)
        return connection.connect_ex(("127.0.0.1", port)) == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-browser", action="store_true", help="Check startup without opening a browser")
    options = parser.parse_args()
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js was not found. Install Node.js, then double-click this launcher again.")
    vite = ROOT / "frontend/node_modules/vite/bin/vite.js"
    if not vite.exists():
        raise RuntimeError("Frontend dependencies are missing. Run scripts/dev.sh once to install them.")

    services = [
        ("API", 8000, ROOT / "backend", [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]),
        ("website", 5173, ROOT / "frontend", [node, str(vite), "--host", "127.0.0.1", "--port", "5173", "--strictPort"]),
    ]
    processes = []
    stopping = False

    def stop_signal(*_):
        nonlocal stopping
        stopping = True

    for signum in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(signum, stop_signal)
    try:
        for kind, port, directory, command in services:
            if ready(kind):
                print(f"Polaris {kind} is already running.", flush=True)
                continue
            if port_busy(port):
                raise RuntimeError(f"Port {port} is being used by another app. Close that app and try again.")
            print(f"Starting Polaris {kind}…", flush=True)
            process = subprocess.Popen(command, cwd=directory, start_new_session=True)
            processes.append(process)
            deadline = time.monotonic() + 45
            while not ready(kind):
                if stopping:
                    return
                if process.poll() is not None:
                    raise RuntimeError(f"The {kind} stopped during startup. See its message above.")
                if time.monotonic() >= deadline:
                    raise RuntimeError(f"The {kind} did not become ready within 45 seconds.")
                time.sleep(0.2)
        print(f"\nPolaris is ready: {URL}", flush=True)
        if not options.no_browser:
            subprocess.run(["/usr/bin/open", URL], check=True)
        if processes:
            print("Keep this window open while using Polaris. Press Control+C here to stop it.", flush=True)
            while not stopping:
                if any(process.poll() is not None for process in processes):
                    raise RuntimeError("A Polaris server stopped. Double-click the launcher to restart it.")
                time.sleep(0.5)
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(f"\n{error}", file=sys.stderr)
        sys.exit(1)
