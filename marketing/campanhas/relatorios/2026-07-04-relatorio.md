---
periodo_inicio: 2026-06-05
periodo_fim: 2026-07-04
investimento_total: 24.51
conversoes_total: 0
cpa_medio: 0.00
canais: [meta-ads]
baseline: true
observacao: "Primeira leitura. Verba de teste (R$24,51 em 30 dias). Sem coluna de conversão preenchida."
---

# Relatório de Ads — 05/06 a 04/07 (30 dias)

## Resumo executivo

**Investimento:** R$ 24,51 (baseline — sem semana anterior pra comparar)
**Conversões:** 0 registradas (coluna "Resultados" veio vazia — ver alerta 🔴)
**CPA médio:** n/d (sem conversão registrada)

**Canais:**
- Meta Ads: R$ 24,51 → 446 impressões, 9 cliques no link (CTR 2,02%)
- Google Ads: sem dados nesta leitura

**Headline da semana:** o criativo tem **CTR acima da média do Meta (2,02% no link)** — bom
sinal de que a mensagem engaja. Mas a verba é mínima (R$ 0,82/dia) e **não há conversão
sendo medida**, então ainda não dá pra dizer se o anúncio *vende*. Antes de escalar,
resolver o rastreamento.

---

## Detalhamento — Meta Ads

Um único anúncio no ar (**Criativo01**, ativo, otimização por orçamento de campanha).

| Métrica | Valor |
|---|---|
| Valor usado | R$ 24,51 |
| Alcance | 383 pessoas |
| Frequência | 1,16 (saudável — sem saturação) |
| Impressões | 446 |
| CPM (custo por mil impressões) | R$ 54,96 |
| Cliques no link | 9 |
| CTR no link (% que clicou) | 2,02% |
| CPC no link (custo por clique) | R$ 2,72 |
| Visualizações da página de destino | 8 (de 9 cliques — 89% chegaram) |
| Cliques (todos) | 15 · CTR 3,36% · CPC R$ 1,63 |
| Finalizações de compra iniciadas | 0 |
| Resultados / conversões | — (nada registrado) |

**Leitura rápida:**
- **CTR bom.** 2,02% no link está acima do padrão do Meta (~1%). O criativo chama atenção.
- **Página segura o clique.** 9 cliques → 8 visualizações da página (89%). A landing carrega
  e não perde gente na porta.
- **O funil para na página.** 8 visitas → 0 finalizações de compra iniciadas. Ou a oferta/página
  ainda não converte, ou (mais provável) **o evento de conversão não está instalado** e por isso
  nada é medido.
- **Volume minúsculo.** 446 impressões é uma amostra pequena demais pra conclusão estatística.
  Tudo aqui é indício, não veredito.

---

## Alertas

| | Alerta | Detalhe |
|---|---|---|
| 🔴 | **Sem medição de conversão** | Colunas "Resultados", "Finalizações de compra" e "Custo por resultado" vazias. Sem o pixel/evento configurado, você gasta às cegas — não sabe o que vira venda. **Prioridade máxima.** |
| 🟡 | **Verba de teste, não de leitura** | R$ 0,82/dia é pouco pra Meta sair do aprendizado e gerar dados confiáveis. Serve pra testar criativo, não pra medir venda. |
| 🟢 | **Criativo engaja** | CTR no link 2,02% — acima da média. O "gancho" funciona; vale ter variações desse mesmo tom. |
| 🟢 | **Público fresco** | Frequência 1,16 — ninguém está sendo bombardeado. Há espaço pra escalar sem cansar a audiência. |

---

## Pra fazer na próxima semana

1. **Instalar/verificar o pixel do Meta + evento de conversão** (Compra e Início de checkout)
   no site — é o que faltou. Sem isso, todo relatório futuro fica cego pro que importa (venda).
   *Ação nº 1, trava tudo o resto.*
2. **Decidir o objetivo desse teste:** se é só validar criativo, R$ 24 está ok. Se é medir venda,
   subir a verba pra um patamar que gere dados (o Meta precisa de ~50 conversões/semana por conjunto
   pra otimizar de verdade).
3. **Preparar 2–3 variações do Criativo01** (mesma linha que deu CTR 2%) pra testar quando a verba
   subir — assim você compara em vez de depender de um só.
4. **Olhar a página de destino com lupa:** 8 visitas e nenhum checkout iniciado. Quando o pixel
   estiver medindo, revisar título, oferta e botão. (Cruzar com o momento de pré-lançamento —
   ver `_memoria/estrategia.md`.)

---

> ⚠️ **Dados incompletos:** export do Meta sem coluna de conversão preenchida; sem export do
> Google Ads. Números de tráfego são reais; qualquer afirmação sobre "venda" fica pendente até
> o rastreamento estar ativo.
