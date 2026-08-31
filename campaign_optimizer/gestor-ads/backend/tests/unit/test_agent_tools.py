from unittest.mock import AsyncMock

import pytest

from app.agent.tools import ToolContext, consultar_metricas, listar_contas, pausar_campanha, selecionar_conta
from app.shared.exceptions import DraftValidationError


def _ctx(fake_supabase, **overrides):
    defaults = dict(supabase=fake_supabase, settings=None, user_id="user-1", conversation_id="conv-1", ad_account_id=None)
    defaults.update(overrides)
    return ToolContext(**defaults)


async def test_listar_contas(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "acc-1", "name": "Fortec", "external_id": "act_1"},
        {"id": "acc-2", "name": "Marca Imobiliária", "external_id": "act_2"},
    ]
    result = await listar_contas(_ctx(fake_supabase))
    assert len(result["contas"]) == 2
    assert result["contas"][0]["name"] == "Fortec"


async def test_selecionar_conta_by_number(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "acc-1", "name": "Fortec", "external_id": "act_1"},
        {"id": "acc-2", "name": "Marca Imobiliária", "external_id": "act_2"},
    ]
    result = await selecionar_conta(_ctx(fake_supabase), conta="2")
    assert result["ad_account_id"] == "acc-2"


async def test_selecionar_conta_ambiguous_raises(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "acc-1", "name": "Fortec Imóveis", "external_id": "act_1"},
        {"id": "acc-2", "name": "Fortec Consórcio", "external_id": "act_2"},
    ]
    with pytest.raises(DraftValidationError):
        await selecionar_conta(_ctx(fake_supabase), conta="fortec")


async def test_selecionar_conta_by_name(fake_supabase):
    fake_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "acc-1", "name": "Fortec Imóveis", "external_id": "act_1"},
    ]
    result = await selecionar_conta(_ctx(fake_supabase), conta="fortec")
    assert result["ad_account_id"] == "acc-1"


async def test_consultar_metricas(fake_supabase):
    meta_client = AsyncMock()
    meta_client.get_insights.return_value = [
        {"spend": "100", "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "5"}]}
    ]
    ctx = _ctx(fake_supabase, ad_account_id="acc-1")
    result = await consultar_metricas(ctx, meta_client)
    assert result["total_spend"] == 100.0
    assert result["total_leads"] == 5


async def test_pausar_campanha(fake_supabase):
    meta_client = AsyncMock()
    meta_client.update_status.return_value = {"success": True}
    ctx = _ctx(fake_supabase, ad_account_id="acc-1")
    result = await pausar_campanha(ctx, meta_client, campanha_id="123")
    meta_client.update_status.assert_called_once_with("123", "PAUSED")
    assert result["status"] == "PAUSED"
