# tests/integration/test_agent_router.py
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.agent.main import app
from app.dependencies import get_supabase

# Hermetic: never build a real Supabase client from env vars in this test —
# the endpoints only need `Depends(get_supabase)` to resolve to *something*
# so the request can be dispatched to the background task.
app.dependency_overrides[get_supabase] = lambda: MagicMock()


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
