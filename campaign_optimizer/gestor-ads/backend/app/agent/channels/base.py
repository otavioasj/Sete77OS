from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class IncomingMessage:
    """Normalized message from any channel — the agent never sees raw
    Telegram/Evolution payloads directly."""

    channel: str
    channel_user_id: str
    raw: dict
    text: str | None = None
    audio_bytes: bytes | None = None
    location: tuple[float, float] | None = None


@runtime_checkable
class ChannelAdapter(Protocol):
    """Common interface every messaging channel implements. The agent loop
    and core/ never know which concrete channel they're talking to."""

    async def send_text(self, chat_id: str, text: str) -> None: ...

    async def receive_webhook(self, payload: dict) -> IncomingMessage: ...

    async def download_media(self, file_ref: str) -> bytes: ...
