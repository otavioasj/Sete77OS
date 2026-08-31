from __future__ import annotations

import pytest

from app.agent.channels.base import ChannelAdapter, IncomingMessage


def test_incoming_message_defaults():
    msg = IncomingMessage(channel="telegram", channel_user_id="123", text="oi", raw={})
    assert msg.audio_bytes is None
    assert msg.location is None


def test_channel_adapter_is_a_protocol():
    class FakeAdapter:
        async def send_text(self, chat_id: str, text: str) -> None: ...
        async def receive_webhook(self, payload: dict) -> IncomingMessage: ...
        async def download_media(self, file_ref: str) -> bytes: ...

    adapter: ChannelAdapter = FakeAdapter()
    assert isinstance(adapter, ChannelAdapter)


import respx
from httpx import Response

from app.agent.channels.telegram import TelegramAdapter


@respx.mock
async def test_telegram_send_text():
    respx.post("https://api.telegram.org/botTEST/sendMessage").mock(
        return_value=Response(200, json={"ok": True})
    )
    adapter = TelegramAdapter(bot_token="TEST")
    await adapter.send_text("chat123", "olá")
    assert respx.calls.last.request.headers["content-type"].startswith("application/json")


async def test_telegram_receive_webhook_text():
    adapter = TelegramAdapter(bot_token="TEST")
    payload = {
        "message": {
            "chat": {"id": 555},
            "text": "quero criar uma campanha",
        }
    }
    msg = await adapter.receive_webhook(payload)
    assert msg.channel == "telegram"
    assert msg.channel_user_id == "555"
    assert msg.text == "quero criar uma campanha"
    assert msg.audio_bytes is None


async def test_telegram_receive_webhook_location():
    adapter = TelegramAdapter(bot_token="TEST")
    payload = {
        "message": {
            "chat": {"id": 555},
            "location": {"latitude": -3.7319, "longitude": -38.5267},
        }
    }
    msg = await adapter.receive_webhook(payload)
    assert msg.location == (-3.7319, -38.5267)


@respx.mock
async def test_telegram_download_media():
    respx.get("https://api.telegram.org/botTEST/getFile", params={"file_id": "abc"}).mock(
        return_value=Response(200, json={"ok": True, "result": {"file_path": "voice/file.oga"}})
    )
    respx.get("https://api.telegram.org/file/botTEST/voice/file.oga").mock(
        return_value=Response(200, content=b"fake-audio-bytes")
    )
    adapter = TelegramAdapter(bot_token="TEST")
    data = await adapter.download_media("abc")
    assert data == b"fake-audio-bytes"
