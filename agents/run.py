"""
▲ Portfolio Monitor — Punto de entrada
Ejecuta: python run.py [--interval 60] [--agents 3] [--once]

Ejemplos:
  python run.py                    # monitoreo continuo, actualiza cada 60s
  python run.py --interval 30      # actualiza cada 30s
  python run.py --once             # una sola pasada y sale
  python run.py --tickers AAPL NVDA TSLA --once   # tickers custom
"""
import asyncio
import argparse
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import GoogleFinanceScraper
from monitor import PortfolioMonitor

# ─── Portafolio del usuario (extraído de tus transacciones reales) ────────────
# Ajusta avg_cost con tu precio promedio de entrada real.
DEFAULT_PORTFOLIO = [
    # Semiconductores
    {"ticker": "ARM",   "avg_cost": 130.00, "alert_up_pct": 20, "alert_down_pct": 10},
    {"ticker": "NVDA",  "avg_cost":  95.00, "alert_up_pct": 20, "alert_down_pct": 10},
    {"ticker": "AMD",   "avg_cost": 180.00, "alert_up_pct": 15, "alert_down_pct": 10},
    {"ticker": "INTC",  "avg_cost":  32.00, "alert_up_pct": 20, "alert_down_pct": 10},
    {"ticker": "TSM",   "avg_cost": 200.00, "alert_up_pct": 15, "alert_down_pct": 8},
    {"ticker": "ASML",  "avg_cost": 791.00, "alert_up_pct": 15, "alert_down_pct": 8},
    # Tech
    {"ticker": "MSFT",  "avg_cost": 440.00, "alert_up_pct": 15, "alert_down_pct": 8},
    {"ticker": "AAPL",  "avg_cost": 210.00, "alert_up_pct": 15, "alert_down_pct": 8},
    {"ticker": "META",  "avg_cost": 570.00, "alert_up_pct": 20, "alert_down_pct": 10},
    {"ticker": "GOOG",  "avg_cost": 185.00, "alert_up_pct": 20, "alert_down_pct": 10},
    {"ticker": "AMZN",  "avg_cost": 188.00, "alert_up_pct": 15, "alert_down_pct": 8},
    {"ticker": "SNOW",  "avg_cost": 221.00, "alert_up_pct": 15, "alert_down_pct": 10},
    # AI / Data
    {"ticker": "PLTR",  "avg_cost": 110.00, "alert_up_pct": 25, "alert_down_pct": 12},
    {"ticker": "PATH",  "avg_cost":  11.76, "alert_up_pct": 15, "alert_down_pct": 10},
    # Infra
    {"ticker": "SMCI",  "avg_cost":  42.00, "alert_up_pct": 20, "alert_down_pct": 12},
    # EV
    {"ticker": "TSLA",  "avg_cost": 295.00, "alert_up_pct": 20, "alert_down_pct": 12},
    # Cripto-proxy
    {"ticker": "IBIT",  "avg_cost":  51.00, "alert_up_pct": 25, "alert_down_pct": 15},
    {"ticker": "MSTR",  "avg_cost": 422.00, "alert_up_pct": 25, "alert_down_pct": 15},
    # Otros
    {"ticker": "UNH",   "avg_cost": 355.00, "alert_up_pct": 10, "alert_down_pct": 8},
    {"ticker": "AFRM",  "avg_cost":  81.90, "alert_up_pct": 20, "alert_down_pct": 12},
    {"ticker": "RKLB",  "avg_cost":  48.55, "alert_up_pct": 25, "alert_down_pct": 15},
    {"ticker": "MP",    "avg_cost":  70.00, "alert_up_pct": 20, "alert_down_pct": 12},
]


# ─── Modo "una sola pasada" ───────────────────────────────────────────────────
async def run_once(tickers: list[str]):
    """Obtiene precios una vez y muestra tabla. Útil para testear."""
    print(f"\n🔍 Consultando {len(tickers)} tickers en Google Finance...\n")
    async with GoogleFinanceScraper(headless=True) as scraper:
        quotes = await scraper.fetch_many(tickers, max_concurrent=5)

    # Tabla de resultados
    print(f"\n{'─'*68}")
    print(f"  {'TICKER':<8} {'PRECIO':>10} {'CAMBIO':>10} {'CAMBIO %':>10}  {'NOMBRE'}")
    print(f"{'─'*68}")

    ok, err = 0, 0
    for q in sorted(quotes, key=lambda x: x.ticker):
        if q.error:
            print(f"  {q.ticker:<8} {'ERROR':>10}   {q.error[:30]}")
            err += 1
        else:
            arrow = "▲" if q.is_up else "▼"
            col   = "\033[92m" if q.is_up else "\033[91m"
            reset = "\033[0m"
            print(f"  {col}{q.ticker:<8} ${q.price:>9.2f} "
                  f"{q.change:>+9.2f} {q.change_pct:>+9.2f}%{reset}  {q.name[:25]}")
            ok += 1

    print(f"{'─'*68}")
    print(f"  ✓ {ok} exitosos  |  ✗ {err} errores\n")
    return quotes


# ─── CLI ─────────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(
        description="▲ Portfolio Monitor — Google Finance scraper sin API")
    p.add_argument("--interval",  type=int, default=60,
                   help="Segundos entre actualizaciones (default: 60)")
    p.add_argument("--agents",    type=int, default=3,
                   help="Número de agentes paralelos (default: 3)")
    p.add_argument("--once",      action="store_true",
                   help="Una sola consulta y salir")
    p.add_argument("--tickers",   nargs="+",
                   help="Tickers custom (ej: AAPL NVDA TSLA)")
    p.add_argument("--alert-up",  type=float, default=15.0,
                   help="Alerta si sube este %% desde costo (default: 15)")
    p.add_argument("--alert-down",type=float, default=8.0,
                   help="Alerta si baja este %% desde costo (default: 8)")
    return p.parse_args()


async def main():
    args = parse_args()

    # Tickers custom o portafolio completo
    if args.tickers:
        portfolio = [
            {"ticker": tk, "avg_cost": 0,
             "alert_up_pct": args.alert_up,
             "alert_down_pct": args.alert_down}
            for tk in args.tickers
        ]
    else:
        portfolio = DEFAULT_PORTFOLIO

    tickers = [p["ticker"] for p in portfolio]

    if args.once:
        await run_once(tickers)
    else:
        monitor = PortfolioMonitor(
            portfolio=portfolio,
            interval_secs=args.interval,
            agents_count=args.agents,
        )
        try:
            await monitor.run()
        except KeyboardInterrupt:
            print("\n\n⏹  Monitor detenido. Hasta luego.\n")


if __name__ == "__main__":
    asyncio.run(main())
