from unittest.mock import MagicMock

import pytest

from app.agent.conversation import (
    get_or_create_conversation,
    link_ad_account,
    record_message,
    update_memory,
)


async def test_get_or_create_conversation_existing(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "conv-1", "owner_id": "user-1", "ad_account_id": None, "resumo_memoria": "", "memoria_negocio": {}}
    ]
    row = await get_or_create_conversation(fake_supabase, "telegram", "555")
    assert row["id"] == "conv-1"


async def test_get_or_create_conversation_creates_new(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    fake_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "conv-new", "owner_id": None, "ad_account_id": None, "resumo_memoria": "", "memoria_negocio": {}}
    ]
    row = await get_or_create_conversation(fake_supabase, "telegram", "555")
    assert row["id"] == "conv-new"


async def test_record_message(fake_supabase):
    await record_message(fake_supabase, "conv-1", "user", "oi", tokens_input=10)
    fake_supabase.table.assert_any_call("messages")


async def test_update_memory(fake_supabase):
    await update_memory(fake_supabase, "conv-1", resumo_memoria="resumo novo")
    fake_supabase.table.assert_any_call("conversations")


async def test_link_ad_account(fake_supabase):
    await link_ad_account(fake_supabase, "conv-1", "acc-1")
    fake_supabase.table.assert_any_call("conversations")
