"""
Portfolio Monitor — Orquestador de agentes de monitoreo
Corre N agentes en paralelo, cada uno especializado en un conjunto de tickers.
Genera alertas cuando los precios cruzan umbrales definidos.
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from dataclasses import dataclass, field
from typing import Callable, Awaitable
from scraper import GoogleFinanceScraper, StockQuote

# ─── Colores ANSI ─────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
GRAY   = "\033[90m"
WHITE  = "\033[97m"
BG_RED = "\033[41m"

# ─── Tipos de alerta ──────────────────────────────────────────────────────────
@dataclass
class Alert:
    level:   str        # "INFO" | "WARNING" | "CRITICAL"
    ticker:  str
    message: str
    price:   float
    ts:      datetime = field(default_factory=datetime.now)

    def __str__(self):
        icons  = {"INFO": "ℹ️ ", "WARNING": "⚠️ ", "CRITICAL": "🚨"}
        colors = {"INFO": CYAN, "WARNING": YELLOW, "CRITICAL": RED + BOLD}
        col = colors.get(self.level, WHITE)
        return (f"{col}{icons.get(self.level,'')} [{self.level}] {self.ticker}: "
                f"{self.message}  → ${self.price:.2f}  {self.ts.strftime('%H:%M:%S')}{RESET}")


# ─── Reglas de alerta ─────────────────────────────────────────────────────────
@dataclass
class AlertRule:
    """Define cuándo disparar una alerta para un ticker."""
    ticker:        str
    avg_cost:      float          # precio de entrada (costo promedio)
    alert_up_pct:  float = 15.0   # alerta si sube este % desde costo
    alert_down_pct:float = 8.0    # alerta si baja este % desde costo
    alert_change_pct: float = 3.0 # alerta si cambia >3% en el día

    def evaluate(self, quote: StockQuote) -> list[Alert]:
        alerts = []
        if quote.price <= 0 or self.avg_cost <= 0:
            return alerts

        # % desde costo de entrada
        from_cost = (quote.price - self.avg_cost) / self.avg_cost * 100

        if from_cost >= self.alert_up_pct:
            alerts.append(Alert("INFO", self.ticker,
                f"+{from_cost:.1f}% sobre precio de entrada (${self.avg_cost:.2f})",
                quote.price))

        if from_cost <= -self.alert_down_pct:
            alerts.append(Alert("WARNING", self.ticker,
                f"{from_cost:.1f}% bajo precio de entrada (${self.avg_cost:.2f})",
                quote.price))

        # Cambio intradiario
        if abs(quote.change_pct) >= self.alert_change_pct:
            level = "CRITICAL" if abs(quote.change_pct) >= 6 else "WARNING"
            alerts.append(Alert(level, self.ticker,
                f"Movimiento intradiario fuerte: {quote.change_pct:+.2f}% hoy",
                quote.price))

        return alerts


# ─── Agente individual ────────────────────────────────────────────────────────
class StockAgent:
    """
    Un agente responsable de monitorear un subconjunto de tickers.
    Corre en su propio loop asíncrono.
    """
    def __init__(self,
                 agent_id: int,
                 tickers: list[str],
                 rules: dict[str, AlertRule],
                 interval_secs: int = 60,
                 on_alert: Callable[[Alert], Awaitable[None]] | None = None):
        self.id            = agent_id
        self.tickers       = tickers
        self.rules         = rules
        self.interval      = interval_secs
        self.on_alert      = on_alert
        self.prices_prev   = {}
        self.running       = False
        self._quotes_cache: dict[str, StockQuote] = {}

    def _header(self):
        return f"{CYAN}[Agente-{self.id}]{RESET}"

    async def run(self, scraper: GoogleFinanceScraper):
        self.running = True
        print(f"{self._header()} Iniciado — monitoreando: {', '.join(self.tickers)}")

        while self.running:
            ts = datetime.now().strftime("%H:%M:%S")
            print(f"\n{GRAY}{'─'*60}{RESET}")
            print(f"{self._header()} {BOLD}Ciclo {ts}{RESET} — {len(self.tickers)} tickers")

            quotes = await scraper.fetch_many(self.tickers, max_concurrent=3)

            for q in quotes:
                self._quotes_cache[q.ticker] = q
                if q.error:
                    print(f"  {RED}✗ {q.ticker}: {q.error[:60]}{RESET}")
                    continue

                # Evaluar reglas
                rule = self.rules.get(q.ticker)
                if rule:
                    for alert in rule.evaluate(q):
                        print(f"\n  {alert}")
                        if self.on_alert:
                            await self.on_alert(alert)

            print(f"{self._header()} Próxima revisión en {self.interval}s")
            await asyncio.sleep(self.interval)

    def stop(self):
        self.running = False
        print(f"{self._header()} Detenido.")

    def get_summary(self) -> list[StockQuote]:
        return list(self._quotes_cache.values())


# ─── Orquestador principal ────────────────────────────────────────────────────
class PortfolioMonitor:
    """
    Divide el portafolio entre múltiples agentes y los coordina.
    Cada agente corre concurrentemente con su propio ciclo.
    """

    def __init__(self,
                 portfolio: list[dict],
                 interval_secs: int = 60,
                 agents_count: int = 3,
                 alert_log: str = "alerts.log"):
        self.portfolio    = portfolio
        self.interval     = interval_secs
        self.agents_count = agents_count
        self.alert_log    = alert_log
        self.alerts: list[Alert] = []
        self._agents: list[StockAgent] = []

    # ── Setup ──────────────────────────────────────────────────────────────
    def _build_rules(self) -> dict[str, AlertRule]:
        rules = {}
        for pos in self.portfolio:
            tk = pos["ticker"].upper()
            rules[tk] = AlertRule(
                ticker=tk,
                avg_cost=pos.get("avg_cost", 0),
                alert_up_pct=pos.get("alert_up_pct", 15.0),
                alert_down_pct=pos.get("alert_down_pct", 8.0),
                alert_change_pct=pos.get("alert_change_pct", 3.0),
            )
        return rules

    def _split_tickers(self, tickers: list[str]) -> list[list[str]]:
        """Divide los tickers equitativamente entre los agentes."""
        n = self.agents_count
        return [tickers[i::n] for i in range(n)]

    async def _handle_alert(self, alert: Alert):
        self.alerts.append(alert)
        # Guardar en log
        with open(self.alert_log, "a") as f:
            f.write(f"{alert.ts.isoformat()} | {alert.level} | {alert.ticker} | "
                    f"{alert.message} | ${alert.price:.2f}\n")

    # ── Run ────────────────────────────────────────────────────────────────
    async def run(self):
        tickers = [p["ticker"].upper() for p in self.portfolio]
        rules   = self._build_rules()
        splits  = self._split_tickers(tickers)

        self._print_banner(tickers)

        async with GoogleFinanceScraper(headless=True) as scraper:
            # Crear agentes
            for i, chunk in enumerate(splits):
                if chunk:
                    agent = StockAgent(
                        agent_id=i + 1,
                        tickers=chunk,
                        rules=rules,
                        interval_secs=self.interval,
                        on_alert=self._handle_alert,
                    )
                    self._agents.append(agent)

            # Correr todos los agentes en paralelo
            try:
                await asyncio.gather(*[
                    agent.run(scraper) for agent in self._agents
                ])
            except asyncio.CancelledError:
                print(f"\n{YELLOW}Monitor detenido por usuario.{RESET}")
            except KeyboardInterrupt:
                pass
            finally:
                self._print_summary()

    def _print_banner(self, tickers: list[str]):
        print(f"\n{BOLD}{CYAN}{'═'*65}{RESET}")
        print(f"{BOLD}{CYAN}  ▲ Portfolio Monitor  —  {len(tickers)} activos  —  "
              f"{self.agents_count} agentes paralelos{RESET}")
        print(f"{BOLD}{CYAN}{'═'*65}{RESET}")
        print(f"  Tickers: {', '.join(tickers)}")
        print(f"  Intervalo: {self.interval}s  |  Fuente: Google Finance (sin API)")
        print(f"  Alertas: {self.alert_log}")
        print(f"{GRAY}{'─'*65}{RESET}\n")

    def _print_summary(self):
        print(f"\n{BOLD}{'═'*65}{RESET}")
        print(f"{BOLD}  Resumen final{RESET}")
        print(f"{'─'*65}")
        all_quotes = []
        for agent in self._agents:
            all_quotes.extend(agent.get_summary())

        if all_quotes:
            print(f"\n  {'Ticker':<8} {'Precio':>10} {'Cambio %':>10}  {'Estado':>12}")
            print(f"  {'─'*8} {'─'*10} {'─'*10}  {'─'*12}")
            for q in sorted(all_quotes, key=lambda x: x.ticker):
                if q.price > 0:
                    state = f"{GREEN}▲{RESET}" if q.is_up else f"{RED}▼{RESET}"
                    print(f"  {q.ticker:<8} ${q.price:>9.2f} "
                          f"{q.change_pct:>+9.2f}%  {state}")

        if self.alerts:
            print(f"\n  {YELLOW}Alertas generadas: {len(self.alerts)}{RESET}")
            for a in self.alerts[-5:]:   # últimas 5
                print(f"  {a}")
        print(f"{BOLD}{'═'*65}{RESET}\n")
