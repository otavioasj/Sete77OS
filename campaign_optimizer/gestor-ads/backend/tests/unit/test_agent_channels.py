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
