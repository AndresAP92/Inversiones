# ▲ Portfolio Monitor — Agentes de Scraping sin API

Monitorea tus acciones en tiempo real navegando **Google Finance** con Playwright.
Sin API key, sin costo, sin límites de requests.

## Instalación (1 vez)

```bash
pip install playwright
playwright install chromium
```

## Uso

```bash
cd agents/

# Una consulta rápida de todos tus tickers
python run.py --once

# Tickers custom, una vez
python run.py --once --tickers AAPL NVDA TSLA META

# Monitoreo continuo (actualiza cada 60s, 3 agentes paralelos)
python run.py

# Monitoreo cada 30s con 5 agentes
python run.py --interval 30 --agents 5

# Alertas personalizadas: avisar si baja 5% o sube 20%
python run.py --alert-down 5 --alert-up 20
```

## Arquitectura

```
run.py
  └── PortfolioMonitor          ← orquestador
        ├── StockAgent-1        ← ARM, NVDA, AMD, INTC, TSM, ASML, MSFT
        ├── StockAgent-2        ← AAPL, META, GOOG, AMZN, SNOW, PLTR, PATH
        └── StockAgent-3        ← SMCI, TSLA, IBIT, MSTR, UNH, AFRM, RKLB, MP
              └── GoogleFinanceScraper  ← Playwright headless → Google Finance
```

Cada agente corre en su propio loop asíncrono, en paralelo.
Dentro de cada agente, los fetches también son concurrentes (semáforo de 3).

## Alertas

Se generan cuando:
- El precio sube X% desde tu costo de entrada → `INFO`
- El precio baja X% desde tu costo de entrada → `WARNING`
- El precio cambia >3% intradiario → `WARNING` / `CRITICAL`

Las alertas se guardan en `alerts.log`.

## Output esperado

```
═════════════════════════════════════════════════════════════════
  ▲ Portfolio Monitor  —  22 activos  —  3 agentes paralelos
═════════════════════════════════════════════════════════════════
  Tickers: ARM, NVDA, AMD, INTC, ...
  Intervalo: 60s  |  Fuente: Google Finance (sin API)

[Agente-1] Iniciado — monitoreando: ARM, NVDA, AMD, INTC, TSM, ASML, MSFT
[Agente-2] Iniciado — monitoreando: AAPL, META, GOOG, AMZN, SNOW, PLTR, PATH
[Agente-3] Iniciado — monitoreando: SMCI, TSLA, IBIT, MSTR, UNH, AFRM, RKLB, MP

──────────────────────────────────────────────────────────────
[Agente-1] Ciclo 14:32:01 — 7 tickers
ARM        $142.91  ▲ +1.23 (+0.87%)  14:32:01
NVDA       $176.60  ▲ +3.45 (+1.99%)  14:32:02
...

⚠️  [WARNING] PLTR: +193.0% sobre precio de entrada ($62.06) → $182.39  14:32:05
```
