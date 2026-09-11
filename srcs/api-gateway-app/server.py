import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify

ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV_FILE, override=False)

app = Flask(__name__)


@app.get("/api/movies")
def list_movies_stub():
    # Temporary stub, replaced once the Inventory proxy is in place.
    return jsonify([]), 200


if __name__ == "__main__":
    port = int(os.getenv("GATEWAY_PORT", "3000"))
    app.run(host="0.0.0.0", port=port)
