from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from jose import jwt

from app.config import get_settings


def generate_oauth_url(user_id: str) -> str:
    """Generate Meta OAuth URL with signed state JWT."""
    settings = get_settings()
    state_payload = {
        "user_id": user_id,
        "nonce": secrets.token_hex(16),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    state = jwt.encode(state_payload, settings.jwt_secret, algorithm="HS256")

    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_redirect_uri,
        "scope": "ads_management,ads_read,business_management,pages_show_list",
        "state": state,
        "response_type": "code",
    }
    return f"https://www.facebook.com/v23.0/dialog/oauth?{urlencode(params)}"


def validate_state(state: str) -> str:
    """Validate state JWT and return user_id. Raises on invalid/expired."""
    settings = get_settings()
    payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
    return payload["user_id"]
