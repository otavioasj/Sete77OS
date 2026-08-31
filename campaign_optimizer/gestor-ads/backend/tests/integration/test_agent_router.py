# tests/integration/test_agent_router.py
from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.agent.main import app


def test_telegram_webhook_acks_immediately():
    with patch("app.agent.router.process_incoming_message", new=AsyncMock()):
        client = TestClient(app)
        payload = {"message": {"chat": {"id": 555}, "text": "oi"}}
        response = client.post("/agent/telegram/webhook", json=payload)
        assert response.status_code == 200
        assert response.json() == {"ok": True}


def test_evolution_webhook_acks_immediately():
    with patch("app.agent.router.process_incoming_message", new=AsyncMock()):
        client = TestClient(app)
        payload = {"data": {"key": {"remoteJid": "5585999@s.whatsapp.net"}, "message": {"conversation": "oi"}}}
        response = client.post("/agent/evolution/webhook", json=payload)
        assert response.status_code == 200
        assert response.json() == {"ok": True}
