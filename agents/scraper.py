"""
Google Finance Scraper Agent
Navega a Google Finance con Playwright y extrae precios sin API.
"""
import asyncio
import re
from dataclasses import dataclass, field
from datetime import datetime
from playwright.async_api import async_playwright, Page, BrowserContext

@dataclass
class StockQuote:
    ticker:     str
    price:      float
    change:     float        # absoluto
    change_pct: float        # porcentaje
    currency:   str = "USD"
    name:       str = ""
    timestamp:  datetime = field(default_factory=datetime.now)
    source:     str = "Google Finance"
    error:      str = ""

    @property
    def is_up(self) -> bool:
        return self.change >= 0

    def __str__(self) -> str:
        sign  = "▲" if self.is_up else "▼"
        color = "\033[92m" if self.is_up else "\033[91m"
        reset = "\033[0m"
        return (f"{color}{self.ticker:8s} ${self.price:>10.2f}  "
                f"{sign} {self.change:+.2f} ({self.change_pct:+.2f}%)  "
                f"{self.timestamp.strftime('%H:%M:%S')}{reset}")


class GoogleFinanceScraper:
    """
    Agente que navega Google Finance y extrae datos de precio.
    Usa Playwright en modo headless — no necesita API key.
    """

    BASE_URL = "https://www.google.com/finance/quote/{ticker}"

    def __init__(self, headless: bool = True, timeout_ms: int = 15_000):
        self.headless   = headless
        self.timeout_ms = timeout_ms
        self._browser   = None
        self._context   = None

    # ── lifecycle ─────────────────────────────────────────────────────────
    async def start(self):
        self._pw      = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"]
        )
        self._context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 720},
        )
        print("[Scraper] Browser listo ✓")

    async def stop(self):
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()
        print("[Scraper] Browser cerrado ✓")

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

    # ── scraping ──────────────────────────────────────────────────────────
    async def fetch(self, ticker: str) -> StockQuote:
        """Obtiene cotización de un ticker desde Google Finance."""
        # Google Finance usa formato TICKER:EXCHANGE para algunos activos
        # Para US stocks simplemente el ticker funciona
        url  = self.BASE_URL.format(ticker=ticker)
        page = await self._context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded",
                            timeout=self.timeout_ms)
            return await self._extract(page, ticker)
        except Exception as e:
            return StockQuote(ticker=ticker, price=0, change=0,
                              change_pct=0, error=str(e))
        finally:
            await page.close()

    async def _extract(self, page: Page, ticker: str) -> StockQuote:
        """Extrae precio y cambio del DOM de Google Finance."""

        # ── precio ────────────────────────────────────────────────────────
        # Google Finance renderiza el precio en un elemento con data-last-price
        # o en el div con clase YMlKec fxKbKc (puede cambiar)
        price = await self._try_selectors(page, [
            '[data-last-price]',           # atributo confiable
            '.YMlKec.fxKbKc',             # clase principal del precio
            '[jsname="ip75Cb"]',           # jsname alternativo
            'div[class*="YMlKec"]',        # fallback parcial
        ])

        # Intentar obtener via data-last-price (más robusto)
        data_price = await page.evaluate("""() => {
            const el = document.querySelector('[data-last-price]');
            return el ? el.getAttribute('data-last-price') : null;
        }""")
        if data_price:
            try:
                price = float(data_price)
            except:
                pass

        # ── cambio y % ────────────────────────────────────────────────────
        change_text = await self._try_text(page, [
            '[data-last-normal]',
            '.P2Luy',
            'span[class*="P2Luy"]',
            '[jsname="Fe7oBc"]',
        ])

        change, change_pct = self._parse_change(change_text)

        # ── nombre ────────────────────────────────────────────────────────
        name = await self._try_text(page, [
            'div[class*="zzDege"]',
            '.zzDege',
            'h1[class*="zzDege"]',
        ], default=ticker)

        # ── currency ──────────────────────────────────────────────────────
        currency = await page.evaluate("""() => {
            const el = document.querySelector('[data-currency-code]');
            return el ? el.getAttribute('data-currency-code') : 'USD';
        }""") or "USD"

        return StockQuote(
            ticker=ticker.upper(),
            price=float(price) if price else 0.0,
            change=change,
            change_pct=change_pct,
            currency=currency,
            name=str(name)[:40],
        )

    # ── helpers ───────────────────────────────────────────────────────────
    async def _try_selectors(self, page: Page, selectors: list,
                              default=0) -> object:
        for sel in selectors:
            try:
                el = await page.query_selector(sel)
                if el:
                    txt = await el.inner_text()
                    val = txt.strip().replace(",", "").replace("$","")
                    return float(val)
            except:
                continue
        return default

    async def _try_text(self, page: Page, selectors: list,
                         default="") -> str:
        for sel in selectors:
            try:
                el = await page.query_selector(sel)
                if el:
                    return (await el.inner_text()).strip()
            except:
                continue
        return default

    @staticmethod
    def _parse_change(text: str) -> tuple[float, float]:
        """Parsea '+1.23 (+0.45%)' → (1.23, 0.45)"""
        if not text:
            return 0.0, 0.0
        nums = re.findall(r"[+-]?\d+\.?\d*", text.replace(",",""))
        if len(nums) >= 2:
            return float(nums[0]), float(nums[1])
        if len(nums) == 1:
            return float(nums[0]), 0.0
        return 0.0, 0.0

    # ── batch fetch (concurrente) ──────────────────────────────────────────
    async def fetch_many(self, tickers: list[str],
                          max_concurrent: int = 4) -> list[StockQuote]:
        """
        Fetches varios tickers en paralelo, máximo max_concurrent a la vez.
        Más rápido que secuencial, más amable que abrir 20 tabs a la vez.
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        results   = []

        async def _guarded(tk):
            async with semaphore:
                q = await self.fetch(tk)
                print(q)
                return q

        tasks = [_guarded(tk) for tk in tickers]
        results = await asyncio.gather(*tasks)
        return list(results)
