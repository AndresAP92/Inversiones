// Portfolio Dashboard Script
// This script powers the interactive dashboard. It maintains arrays of
// transaction records and USD purchases, persists them to localStorage,
// computes summaries and renders charts and tables. It also supports
// importing transactions from an Excel/CSV file and updating prices via
// an external API. The goal is to provide a simple yet powerful tool
// for investors to monitor and manage their portfolios.

/* =========================================================================
 *  Global data structures and defaults
 * ========================================================================= */

// Active transaction list. Each entry has:
// fecha (string YYYY-MM-DD), indice (ticker), usd (number), shares (number),
// precio_compra (number), precio_actual (number), valor_actual (number),
// rentabilidad_pct (number), rentabilidad_clp (number)
let transactions = [];

// Active USD purchase list. Each entry has:
// fecha (string YYYY-MM-DD), cantidad (USD), tc (tipo de cambio CLP por USD)
let usdPurchases = [];

// Default dataset extracted from the user's "Inversiones" sheet. These
// records include only the base fields; derived fields are computed
// when loaded. By bundling this data here we avoid requiring a file
// upload on first use.
const DEFAULT_TRANSACTIONS = JSON.parse(
  '[{"fecha": "2024-03-08", "indice": "ARM", "usd": 1500.0, "shares": 10.74986, "precio_compra": 139.5367, "precio_actual": 142.91}, {"fecha": "2024-03-08", "indice": "ARM", "usd": 200.0, "shares": 1.46028, "precio_compra": 136.96, "precio_actual": 142.91}, {"fecha": "2024-03-08", "indice": "NVDA", "usd": 1500.0, "shares": 15.67735583, "precio_compra": 95.6794, "precio_actual": 176.6}, {"fecha": "2024-03-08", "indice": "MSFT", "usd": 1200.0, "shares": 2.926329651, "precio_compra": 410.07, "precio_actual": 517.93}, {"fecha": "2024-03-08", "indice": "AMD", "usd": 1000.0, "shares": 4.525508102, "precio_compra": 220.969, "precio_actual": 157.39}, {"fecha": "2024-03-08", "indice": "AMD", "usd": 206.8, "shares": 0.931817, "precio_compra": 221.932, "precio_actual": 157.39}, {"fecha": "2024-03-08", "indice": "AAPL", "usd": 1000.0, "shares": 5.82853226, "precio_compra": 171.5693, "precio_actual": 245.5}, {"fecha": "2024-03-08", "indice": "META", "usd": 1000.0, "shares": 1.913795, "precio_compra": 522.522, "precio_actual": 778.38}, {"fecha": "2024-03-08", "indice": "DELL", "usd": 700.0, "shares": 5.865969005, "precio_compra": 119.3321, "precio_actual": 131.94}, {"fecha": "2024-03-08", "indice": "GOOG", "usd": 600.0, "shares": 4.334734895, "precio_compra": 138.417, "precio_actual": 255.24}, {"fecha": "2024-03-08", "indice": "INTC", "usd": 700.0, "shares": 15.298164866, "precio_compra": 45.7569, "precio_actual": 29.58}, {"fecha": "2024-03-08", "indice": "AMZN", "usd": 500.0, "shares": 2.80328, "precio_compra": 178.3639, "precio_actual": 231.48}, {"fecha": "2024-03-08", "indice": "SAN", "usd": 400.0, "shares": 92.599648, "precio_compra": 4.3197, "precio_actual": 10.24}, {"fecha": "2024-03-18", "indice": "SMCI", "usd": 1054.96, "shares": 10.30258521, "precio_compra": 102.3976, "precio_actual": 45.81}, {"fecha": "2024-04-12", "indice": "INTC", "usd": 126.98, "shares": 3.518426156, "precio_compra": 36.09, "precio_actual": 29.58}, {"fecha": "2024-04-12", "indice": "AMD", "usd": 300.0, "shares": 1.846585663, "precio_compra": 162.46, "precio_actual": 157.39}, {"fecha": "2024-04-12", "indice": "SMCI", "usd": 100.0, "shares": 1.09673173, "precio_compra": 91.18, "precio_actual": 45.81}, {"fecha": "2024-04-19", "indice": "SAN", "usd": -439.85, "shares": -92.599648, "precio_compra": 10.24, "precio_actual": 4.75}, {"fecha": "2024-04-22", "indice": "DELL", "usd": -674.59, "shares": -5.865969005, "precio_compra": 131.94, "precio_actual": 115.0}, {"fecha": "2024-04-22", "indice": "GOOG", "usd": -676.26, "shares": -4.334734895, "precio_compra": 255.24, "precio_actual": 156.01}, {"fecha": "2024-04-22", "indice": "AAPL", "usd": -964.62, "shares": -5.82853226, "precio_compra": 245.5, "precio_actual": 165.5}, {"fecha": "2024-04-22", "indice": "MSFT", "usd": -1171.12, "shares": -2.926329651, "precio_compra": 517.93, "precio_actual": 400.2}, {"fecha": "2024-04-22", "indice": "ARM", "usd": 1000.0, "shares": 10.96065107, "precio_compra": 91.235, "precio_actual": 142.91}, {"fecha": "2024-04-22", "indice": "NVDA", "usd": 1000.0, "shares": 12.81272662, "precio_compra": 78.0474, "precio_actual": 176.6}, {"fecha": "2024-04-22", "indice": "SMCI", "usd": 1000.0, "shares": 13.97600599, "precio_compra": 71.5512, "precio_actual": 45.81}, {"fecha": "2024-04-22", "indice": "AMD", "usd": 486.59, "shares": 3.282454303, "precio_compra": 148.2392, "precio_actual": 157.39}, {"fecha": "2024-05-06", "indice": "DELL", "usd": 2.2, "shares": 0.0178, "precio_compra": 125.0, "precio_actual": 131.94}, {"fecha": "2024-05-06", "indice": "GOOG", "usd": 107.34, "shares": 0.6341, "precio_compra": 169.28, "precio_actual": 255.24}, {"fecha": "2024-06-21", "indice": "AMD", "usd": -788.98, "shares": -4.875038569, "precio_compra": 157.39, "precio_actual": 161.84}, {"fecha": "2024-07-12", "indice": "MSFT", "usd": 234.33, "shares": 0.506134174, "precio_compra": 462.98, "precio_actual": 517.93}, {"fecha": "2024-07-12", "indice": "AAPL", "usd": 300.0, "shares": 1.296512381, "precio_compra": 231.39, "precio_actual": 245.5}, {"fecha": "2024-07-18", "indice": "TSM", "usd": 250.0, "shares": 1.4326, "precio_compra": 174.51, "precio_actual": 264.87}, {"fecha": "2024-07-18", "indice": "SMCI", "usd": 500.0, "shares": 6.158, "precio_compra": 81.192, "precio_actual": 45.81}, {"fecha": "2024-07-18", "indice": "GOOG", "usd": 200.0, "shares": 1.0971, "precio_compra": 182.31, "precio_actual": 255.24}, {"fecha": "2024-07-18", "indice": "INTC", "usd": 112.69, "shares": 3.186, "precio_compra": 35.37, "precio_actual": 29.58}, {"fecha": "2024-08-01", "indice": "AMD", "usd": -783.66, "shares": -5.711326499, "precio_compra": 157.39, "precio_actual": 137.21}, {"fecha": "2024-08-01", "indice": "INTC", "usd": -664.12, "shares": -22.00259102, "precio_compra": 29.58, "precio_actual": 30.09}, {"fecha": "2024-08-26", "indice": "NVDA", "usd": -666.01, "shares": -5.1337, "precio_compra": 176.6, "precio_actual": 129.73}, {"fecha": "2024-09-10", "indice": "NVDA", "usd": -1500.0, "shares": -13.98992725, "precio_compra": 176.6, "precio_actual": 107.22}, {"fecha": "2024-09-10", "indice": "ARM", "usd": 500.0, "shares": 3.985805765, "precio_compra": 125.45, "precio_actual": 142.91}, {"fecha": "2024-09-10", "indice": "SMCI", "usd": 1000.0, "shares": 24.56217915, "precio_compra": 40.713, "precio_actual": 45.81}, {"fecha": "2024-09-26", "indice": "META", "usd": -1082.0, "shares": -1.913795, "precio_compra": 778.38, "precio_actual": 564.9}, {"fecha": "2024-09-26", "indice": "SMCI", "usd": 1082.0, "shares": 27.48354416, "precio_compra": 39.369, "precio_actual": 45.81}, {"fecha": "2024-10-01", "indice": "AAPL", "usd": 441.62, "shares": 1.959307174, "precio_compra": 225.4, "precio_actual": 245.5}, {"fecha": "2024-11-06", "indice": "TSLA", "usd": 322.32, "shares": 1.1324, "precio_compra": 284.64, "precio_actual": 426.07}, {"fecha": "2024-11-12", "indice": "SMCI", "usd": -1885.57, "shares": -83.57904624, "precio_compra": 45.81, "precio_actual": 22.56}, {"fecha": "2024-11-12", "indice": "SMCI", "usd": 1885.58, "shares": 83.816274459, "precio_compra": 22.5, "precio_actual": 45.81}, {"fecha": "2024-11-18", "indice": "PLTR", "usd": 500.0, "shares": 8.0565, "precio_compra": 62.06, "precio_actual": 182.39}, {"fecha": "2024-11-18", "indice": "META", "usd": 400.0, "shares": 0.7242, "precio_compra": 552.35, "precio_actual": 778.38}, {"fecha": "2024-11-18", "indice": "IBIT", "usd": 426.66, "shares": 8.2879, "precio_compra": 51.48, "precio_actual": 65.37}, {"fecha": "2024-12-02", "indice": "SMCI", "usd": -3340.98, "shares": -83.8163, "precio_compra": 45.81, "precio_actual": 39.86}, {"fecha": "2024-12-03", "indice": "SMCI", "usd": 3340.98, "shares": 75.815405073, "precio_compra": 44.07, "precio_actual": 45.81}, {"fecha": "2024-12-16", "indice": "AAPL", "usd": -450.02, "shares": -1.8092, "precio_compra": 245.5, "precio_actual": 248.74}, {"fecha": "2024-12-16", "indice": "MSTR", "usd": 450.02, "shares": 1.0664, "precio_compra": 422.02, "precio_actual": 344.75}, {"fecha": "2025-01-27", "indice": "AMZN", "usd": -400.0, "shares": -1.7183, "precio_compra": 231.48, "precio_actual": 232.74}, {"fecha": "2025-01-27", "indice": "NVDA", "usd": 400.0, "shares": 3.3554, "precio_compra": 119.21, "precio_actual": 176.6}, {"fecha": "2025-03-05", "indice": "ARM", "usd": 150.0, "shares": 1.2205, "precio_compra": 122.9, "precio_actual": 142.91}, {"fecha": "2025-03-05", "indice": "META", "usd": 344.13, "shares": 0.5277, "precio_compra": 652.176, "precio_actual": 778.38}, {"fecha": "2025-03-05", "indice": "PLTR", "usd": 250.0, "shares": 2.8438, "precio_compra": 87.91, "precio_actual": 182.39}, {"fecha": "2025-03-19", "indice": "GOOG", "usd": 869.16, "shares": 5.3104, "precio_compra": 163.67, "precio_actual": 255.24}, {"fecha": "2025-03-19", "indice": "ARM", "usd": 869.16, "shares": 7.4373, "precio_compra": 116.87, "precio_actual": 142.91}, {"fecha": "2025-03-19", "indice": "META", "usd": 1629.67, "shares": 2.8092, "precio_compra": 580.11, "precio_actual": 778.38}, {"fecha": "2025-03-19", "indice": "AMZN", "usd": 543.22, "shares": 2.8206, "precio_compra": 192.59, "precio_actual": 231.48}, {"fecha": "2025-03-28", "indice": "PLTR", "usd": 600.0, "shares": 7.0536, "precio_compra": 85.06, "precio_actual": 182.39}, {"fecha": "2025-03-28", "indice": "BRK.B", "usd": 812.38, "shares": 1.5419, "precio_compra": 526.86, "precio_actual": 492.85}, {"fecha": "2025-05-07", "indice": "SMCI", "usd": 1500.0, "shares": 48.796356538, "precio_compra": 30.74, "precio_actual": 45.81}, {"fecha": "2025-05-08", "indice": "ARM", "usd": 1250.34, "shares": 10.8292, "precio_compra": 115.46, "precio_actual": 142.91}, {"fecha": "2025-06-06", "indice": "TSLA", "usd": 1708.94, "shares": 5.7337, "precio_compra": 298.05, "precio_actual": 426.07}, {"fecha": "2025-07-07", "indice": "TSM", "usd": 400.0, "shares": 1.7291, "precio_compra": 231.34, "precio_actual": 264.87}, {"fecha": "2025-07-07", "indice": "MSFT", "usd": 400.0, "shares": 0.8041, "precio_compra": 497.45, "precio_actual": 517.93}, {"fecha": "2025-07-07", "indice": "SNOW", "usd": 400.0, "shares": 1.8088, "precio_compra": 221.14, "precio_actual": 230.48}, {"fecha": "2025-07-07", "indice": "ASML", "usd": 128.09, "shares": 0.1618, "precio_compra": 791.61, "precio_actual": 932.15}, {"fecha": "2025-08-01", "indice": "MP", "usd": 400.0, "shares": 6.3209, "precio_compra": 63.28, "precio_actual": 73.22}, {"fecha": "2025-08-01", "indice": "ARM", "usd": 400.0, "shares": 2.9059, "precio_compra": 137.65, "precio_actual": 142.91}, {"fecha": "2025-08-01", "indice": "PLTR", "usd": 433.43, "shares": 2.7712, "precio_compra": 156.41, "precio_actual": 182.39}, {"fecha": "2025-08-01", "indice": "FIG", "usd": 1.0, "shares": 0.008479175, "precio_compra": 117.94, "precio_actual": 56.81}, {"fecha": "2025-08-06", "indice": "SMCI", "usd": 2045.2, "shares": 44.4933, "precio_compra": 45.97, "precio_actual": 45.81}, {"fecha": "2025-08-08", "indice": "META", "usd": -2999.13, "shares": -3.93215718, "precio_compra": 778.38, "precio_actual": 762.72}, {"fecha": "2025-08-08", "indice": "MP", "usd": 2999.13, "shares": 38.7535948, "precio_compra": 77.39, "precio_actual": 73.22}, {"fecha": "2025-08-19", "indice": "TSLA", "usd": -2287.06, "shares": -6.8661, "precio_compra": 426.07, "precio_actual": 333.09}, {"fecha": "2025-08-19", "indice": "PLTR", "usd": 187.06, "shares": 1.1659, "precio_compra": 160.44, "precio_actual": 182.39}, {"fecha": "2025-08-28", "indice": "ARM", "usd": -6986.48, "shares": -49.5495, "precio_compra": 142.91, "precio_actual": 141.0}, {"fecha": "2025-08-28", "indice": "NVDA", "usd": -2302.12, "shares": -12.7238, "precio_compra": 176.6, "precio_actual": 180.93}, {"fecha": "2025-08-28", "indice": "SMCI", "usd": -7597.89, "shares": -169.105, "precio_compra": 45.81, "precio_actual": 44.93}, {"fecha": "2025-08-29", "indice": "PLTR", "usd": 3000.0, "shares": 19.0928, "precio_compra": 157.13, "precio_actual": 182.39}, {"fecha": "2025-08-29", "indice": "ARM", "usd": 3500.0, "shares": 25.2759, "precio_compra": 138.47, "precio_actual": 142.91}, {"fecha": "2025-08-29", "indice": "SMCI", "usd": 8031.0, "shares": 193.1554, "precio_compra": 41.58, "precio_actual": 45.81}, {"fecha": "2025-09-03", "indice": "GOOG", "usd": 2361.04, "shares": 10.4272, "precio_compra": 226.43, "precio_actual": 255.24}, {"fecha": "2025-09-03", "indice": "MP", "usd": -1499.34, "shares": -22.0491, "precio_compra": 73.22, "precio_actual": 68.0}, {"fecha": "2025-09-03", "indice": "OPEN", "usd": 1499.34, "shares": 284.0632, "precio_compra": 5.28, "precio_actual": 9.57}, {"fecha": "2025-09-08", "indice": "OPEN", "usd": 1438.66, "shares": 219.777940704, "precio_compra": 6.55, "precio_actual": 9.57}, {"fecha": "2025-09-11", "indice": "OPEN", "usd": -4984.25, "shares": -503.8411407, "precio_compra": 9.57, "precio_actual": 9.89}, {"fecha": "2025-09-12", "indice": "PATH", "usd": 1500.0, "shares": 127.551, "precio_compra": 11.76, "precio_actual": 11.87}, {"fecha": "2025-09-12", "indice": "AFRM", "usd": 500.0, "shares": 6.105, "precio_compra": 81.9, "precio_actual": 92.18}, {"fecha": "2025-09-12", "indice": "INTC", "usd": 1000.0, "shares": 40.6339, "precio_compra": 24.61, "precio_actual": 29.58}, {"fecha": "2025-09-12", "indice": "UNH", "usd": 2190.94, "shares": 6.168, "precio_compra": 355.21, "precio_actual": 336.69}, {"fecha": "2025-09-16", "indice": "BRK.B", "usd": -753.01, "shares": -1.5419, "precio_compra": 492.85, "precio_actual": 488.36}, {"fecha": "2025-09-16", "indice": "RKLB", "usd": 753.01, "shares": 15.51, "precio_compra": 48.55, "precio_actual": 47.79}]'
);

const DEFAULT_USD_PURCHASES = JSON.parse(
  '[{"fecha": "2024-03-08", "cantidad": 3116.88, "tc": 962.5}, {"fecha": "2024-03-08", "cantidad": 4675.32, "tc": 962.5}, {"fecha": "2024-03-08", "cantidad": 2714.6, "tc": 962.5}, {"fecha": "2024-03-18", "cantidad": 1054.96, "tc": 947.9}, {"fecha": "2024-04-08", "cantidad": 526.98, "tc": 948.8}, {"fecha": "2024-05-06", "cantidad": 107.34, "tc": 931.62}, {"fecha": "2024-07-09", "cantidad": 534.33, "tc": 935.75}, {"fecha": "2024-07-18", "cantidad": 1062.69, "tc": 941.01}, {"fecha": "2024-10-01", "cantidad": 441.62, "tc": 905.76}, {"fecha": "2024-11-04", "cantidad": 322.24, "tc": 962.016129}, {"fecha": "2024-11-18", "cantidad": 1326.66, "tc": 979.9}, {"fecha": "2024-03-05", "cantidad": 744.12, "tc": 940.71}, {"fecha": "2025-03-19", "cantidad": 5323.59, "tc": 920.43}, {"fecha": "2025-05-02", "cantidad": 1163.25, "tc": 945.63}, {"fecha": "2025-05-05", "cantidad": 1586.96, "tc": 945.2}, {"fecha": "2025-06-06", "cantidad": 1707.75, "tc": 936.91}, {"fecha": "2025-07-07", "cantidad": 1328.09, "tc": 941.2}, {"fecha": "2025-08-01", "cantidad": 1234.31, "tc": 972.2}, {"fecha": "2025-08-06", "cantidad": 2045.19, "tc": 977.9}, {"fecha": "2025-09-08", "cantidad": 1438.86, "tc": 972.99}, {"fecha": "2025-09-11", "cantidad": 206.69, "tc": 967.63}]'
);

/* =========================================================================
 *  Persistent storage helpers
 * ========================================================================= */

// Save current transactions to localStorage
function saveTransactions() {
    window.localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Save current USD purchases to localStorage
function saveUsdPurchases() {
    window.localStorage.setItem('usdPurchases', JSON.stringify(usdPurchases));
}

// Load transactions from localStorage or default dataset. Computes derived fields
// for each record when default data is used.
function loadTransactions() {
    const stored = window.localStorage.getItem('transactions');
    if (stored) {
        try {
            const arr = JSON.parse(stored);
            if (Array.isArray(arr)) {
                transactions = arr;
                return;
            }
        } catch (err) {
            console.warn('Error parsing stored transactions, resetting.', err);
        }
    }
    // Use default dataset
    transactions = DEFAULT_TRANSACTIONS.map(rec => {
        const precioActual = rec.precio_actual || rec.precio_compra;
        const valorActual = precioActual * rec.shares;
        const rentPct = ((precioActual - rec.precio_compra) / (rec.precio_compra || 1)) * 100;
        const rentClp = rec.usd * (rentPct / 100) * 950;
        return {
            fecha: rec.fecha,
            indice: rec.indice,
            usd: rec.usd,
            shares: rec.shares,
            precio_compra: rec.precio_compra,
            precio_actual: precioActual,
            valor_actual: valorActual,
            rentabilidad_pct: rentPct,
            rentabilidad_clp: rentClp
        };
    });
    saveTransactions();
}

// Load USD purchases from localStorage or default dataset
function loadUsdPurchases() {
    const stored = window.localStorage.getItem('usdPurchases');
    if (stored) {
        try {
            const arr = JSON.parse(stored);
            if (Array.isArray(arr)) {
                usdPurchases = arr;
                return;
            }
        } catch (err) {
            console.warn('Error parsing stored USD purchases, resetting.', err);
        }
    }
    usdPurchases = DEFAULT_USD_PURCHASES.slice();
    saveUsdPurchases();
}

/* =========================================================================
 *  Formatting helpers
 * ========================================================================= */

// Format a number with thousands separator and a fixed number of decimals
function formatNumber(num, decimals = 2) {
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/* =========================================================================
 *  Real-time price provider configuration
 * ========================================================================= */

// Configure the provider and API key. The REALTIME_PROVIDER can be set to
// 'alphavantage', 'finnhub', or 'alphavantage_mcp'. For best performance
// with the provided key, we default to the MCP server which supports bulk
// quotes and is more efficient. See README for details.
const REALTIME_PROVIDER = 'alphavantage_mcp';
const API_KEY = 'DWLYG2EU64I39MR7';

/* =========================================================================
 *  Fetch latest price for a ticker using selected provider
 * ========================================================================= */
async function fetchLatestPrice(ticker) {
    try {
        if (REALTIME_PROVIDER === 'alphavantage') {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${API_KEY}`;
            const resp = await fetch(url);
            const json = await resp.json();
            const price = json?.['Global Quote']?.['05. price'];
            return price ? parseFloat(price) : null;
        } else if (REALTIME_PROVIDER === 'finnhub') {
            const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${API_KEY}`;
            const resp = await fetch(url);
            const json = await resp.json();
            return json?.c ? parseFloat(json.c) : null;
        } else if (REALTIME_PROVIDER === 'alphavantage_mcp') {
            // Use JSON-RPC call to MCP server for bulk quotes (single ticker)
            const mcpUrl = `https://mcp.alphavantage.co/mcp?apikey=${API_KEY}`;
            const payload = {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: {
                    name: 'REALTIME_BULK_QUOTES',
                    arguments: {
                        symbols: [ticker]
                    }
                }
            };
            const resp = await fetch(mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            // Response may be JSON or SSE; try to parse JSON directly
            const json = await resp.json();
            const content = json?.result?.content?.[0];
            if (!content) return null;
            if (content.type === 'json' && content.json) {
                const price = content.json[ticker]?.price;
                return price !== undefined ? parseFloat(price) : null;
            }
            if (content.type === 'text' && typeof content.text === 'string') {
                try {
                    const parsed = JSON.parse(content.text);
                    const price = parsed?.[ticker]?.price;
                    return price !== undefined ? parseFloat(price) : null;
                } catch (err) {
                    // fallback: find first number pattern
                    const match = content.text.match(/([0-9]+\.?[0-9]*)/);
                    return match ? parseFloat(match[1]) : null;
                }
            }
        }
    } catch (err) {
        console.error('Error fetching price for', ticker, err);
    }
    return null;
}

/* =========================================================================
 *  Price update logic
 * ========================================================================= */
async function updateRealTimePrices() {
    const priceMessage = document.getElementById('price-message');
    const updateBtn = document.getElementById('update-prices');
    // Provide feedback to the user
    priceMessage.className = 'alert alert-info';
    priceMessage.textContent = 'Actualizando precios...';
    priceMessage.style.display = 'block';
    updateBtn.disabled = true;
    try {
        const tickers = [...new Set(transactions.map(t => t.indice))];
        const priceMap = {};
        for (const ticker of tickers) {
            const price = await fetchLatestPrice(ticker);
            if (price !== null) {
                priceMap[ticker] = price;
            }
            // Delay between calls to avoid rate limit issues
            if (REALTIME_PROVIDER === 'alphavantage') {
                await new Promise(r => setTimeout(r, 12000));
            } else {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        transactions = transactions.map(rec => {
            const newPrice = priceMap[rec.indice] ?? rec.precio_actual;
            const precioActual = newPrice;
            const valorActual = precioActual * rec.shares;
            const rentPct = ((precioActual - rec.precio_compra) / (rec.precio_compra || 1)) * 100;
            const rentClp = rec.usd * (rentPct / 100) * 950;
            return {
                ...rec,
                precio_actual: precioActual,
                valor_actual: valorActual,
                rentabilidad_pct: rentPct,
                rentabilidad_clp: rentClp
            };
        });
        saveTransactions();
        renderTable();
        computeSummary();
        generateAlerts();
        updateInvestmentChart();
        priceMessage.className = 'alert alert-success';
        priceMessage.textContent = 'Precios actualizados correctamente';
    } catch (err) {
        console.error(err);
        priceMessage.className = 'alert alert-danger';
        priceMessage.textContent = 'Error al actualizar precios. Por favor intente más tarde.';
    } finally {
        updateBtn.disabled = false;
        // Hide the message after a short delay
        setTimeout(() => {
            priceMessage.style.display = 'none';
        }, 5000);
    }
}

// Automatically refresh prices every 30 minutes if API key configured
setInterval(() => {
    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
        updateRealTimePrices();
    }
}, 30 * 60 * 1000);

/* =========================================================================
 *  Summary computations
 * ========================================================================= */
function computeSummary() {
    let totalInvested = 0;
    let totalValue = 0;
    let totalRentClp = 0;
    transactions.forEach(rec => {
        totalInvested += rec.usd || 0;
        totalValue += rec.valor_actual || 0;
        totalRentClp += rec.rentabilidad_clp || 0;
    });
    const rentPct = totalInvested ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
    document.getElementById('total-invested').textContent = '$' + formatNumber(totalInvested);
    document.getElementById('total-value').textContent = '$' + formatNumber(totalValue);
    document.getElementById('rentabilidad-pct').textContent = formatNumber(rentPct) + '%';
    document.getElementById('rentabilidad-clp').textContent = '$' + formatNumber(totalRentClp, 0);
}

function computeUsdSummary() {
    let totalUSD = 0;
    let totalCLP = 0;
    usdPurchases.forEach(p => {
        totalUSD += p.cantidad || 0;
        totalCLP += (p.cantidad || 0) * (p.tc || 0);
    });
    const avgTC = totalUSD ? (totalCLP / totalUSD) : 0;
    document.getElementById('total-usd').textContent = '$' + formatNumber(totalUSD);
    document.getElementById('total-usd-clp').textContent = '$' + formatNumber(totalCLP, 0);
    document.getElementById('avg-tc').textContent = formatNumber(avgTC);
}

/* =========================================================================
 *  Rendering functions
 * ========================================================================= */
let dataTable;
let usdDataTable;
let investmentChart;
let usdChart;

function renderTable() {
    // Destroy existing DataTable to avoid duplicates
    if (dataTable) {
        dataTable.destroy();
        $('#transactions-table tbody').empty();
    }
    const tbody = document.querySelector('#transactions-table tbody');
    transactions.forEach((rec, idx) => {
        const tr = document.createElement('tr');
        // Determine class for rentability
        const pctClass = rec.rentabilidad_pct > 0 ? 'rent-pos' : (rec.rentabilidad_pct < 0 ? 'rent-neg' : '');
        tr.innerHTML = `
            <td>${rec.fecha}</td>
            <td>${rec.indice}</td>
            <td>${formatNumber(rec.usd)}</td>
            <td>${formatNumber(rec.shares)}</td>
            <td>${formatNumber(rec.precio_compra)}</td>
            <td>${formatNumber(rec.precio_actual)}</td>
            <td>${formatNumber(rec.valor_actual)}</td>
            <td class="${pctClass}">${formatNumber(rec.rentabilidad_pct)}%</td>
            <td class="${pctClass}">${formatNumber(rec.rentabilidad_clp, 0)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-secondary me-1 edit-transaction" data-index="${idx}">Editar</button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-transaction" data-index="${idx}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    dataTable = $('#transactions-table').DataTable({
        order: [[0, 'desc']],
        pageLength: 25
    });
    computeSummary();
    generateAlerts();
    // Bind events
    $('#transactions-table tbody').off('click', '.edit-transaction');
    $('#transactions-table tbody').off('click', '.delete-transaction');
    $('#transactions-table tbody').on('click', '.edit-transaction', function () {
        const idx = parseInt($(this).data('index'));
        openEditModal(idx);
    });
    $('#transactions-table tbody').on('click', '.delete-transaction', function () {
        const idx = parseInt($(this).data('index'));
        if (confirm('¿Está seguro de que desea eliminar esta transacción?')) {
            transactions.splice(idx, 1);
            saveTransactions();
            renderTable();
        }
    });
}

function renderUsdTable() {
    if (usdDataTable) {
        usdDataTable.destroy();
        $('#usd-table tbody').empty();
    }
    const tbody = document.querySelector('#usd-table tbody');
    usdPurchases.forEach((rec, idx) => {
        const montoCLP = (rec.cantidad || 0) * (rec.tc || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rec.fecha}</td>
            <td>${formatNumber(rec.cantidad)}</td>
            <td>${formatNumber(rec.tc)}</td>
            <td>${formatNumber(montoCLP, 0)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-secondary me-1 edit-usd" data-index="${idx}">Editar</button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-usd" data-index="${idx}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    usdDataTable = $('#usd-table').DataTable({
        order: [[0, 'desc']],
        pageLength: 25
    });
    computeUsdSummary();
    updateInvestmentChart();
    updateUsdChart();
    // Bind events
    $('#usd-table tbody').off('click', '.edit-usd');
    $('#usd-table tbody').off('click', '.delete-usd');
    $('#usd-table tbody').on('click', '.edit-usd', function () {
        const idx = parseInt($(this).data('index'));
        openEditUsdModal(idx);
    });
    $('#usd-table tbody').on('click', '.delete-usd', function () {
        const idx = parseInt($(this).data('index'));
        if (confirm('¿Está seguro de que desea eliminar esta compra de dólares?')) {
            usdPurchases.splice(idx, 1);
            saveUsdPurchases();
            renderUsdTable();
        }
    });
}

/* =========================================================================
 *  Chart rendering
 * ========================================================================= */
// Generate palette for chart segments
function generatePalette(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
        const hue = Math.round((360 * i) / Math.max(1, n));
        colors.push(`hsl(${hue}, 65%, 55%)`);
    }
    return colors;
}

function updateInvestmentChart() {
    const ctx = document.getElementById('investment-chart').getContext('2d');
    const dist = {};
    transactions.forEach(rec => {
        const val = rec.valor_actual || 0;
        if (!dist[rec.indice]) dist[rec.indice] = 0;
        dist[rec.indice] += val;
    });
    const labels = [];
    const values = [];
    Object.keys(dist).forEach(key => {
        const v = dist[key];
        if (v !== 0) {
            labels.push(key);
            values.push(Math.abs(v));
        }
    });
    const colors = generatePalette(labels.length);
    if (investmentChart) investmentChart.destroy();
    investmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: colors }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Distribución del Portafolio' },
                legend: { position: 'right' }
            }
        }
    });
}

function updateUsdChart() {
    const ctx = document.getElementById('usd-chart').getContext('2d');
    const sorted = [...usdPurchases].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const labels = sorted.map(p => p.fecha);
    const qtyData = sorted.map(p => p.cantidad);
    const tcData = sorted.map(p => p.tc);
    if (usdChart) usdChart.destroy();
    usdChart = new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Cantidad (USD)',
                    data: qtyData,
                    backgroundColor: 'rgba(13, 110, 253, 0.4)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Tipo de cambio (CLP)',
                    data: tcData,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Compras de dólares' },
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'USD' },
                    ticks: { beginAtZero: true }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'TC (CLP)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

/* =========================================================================
 *  Alert generation
 * ========================================================================= */
function generateAlerts() {
    const list = document.getElementById('alerts-list');
    list.innerHTML = '';
    let count = 0;
    transactions.forEach(rec => {
        let msg = null;
        if (rec.rentabilidad_pct > 20) {
            msg = `${rec.indice}: la rentabilidad supera el 20%. Considere tomar ganancias.`;
        } else if (rec.rentabilidad_pct < -10) {
            msg = `${rec.indice}: la rentabilidad cae por debajo de -10%. Revise su posición.`;
        }
        if (msg) {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = msg;
            list.appendChild(li);
            count++;
        }
    });
    if (count === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = 'No hay alertas en este momento.';
        list.appendChild(li);
    }
}

/* =========================================================================
 *  File import
 * ========================================================================= */
// The selected file is stored here until the user clicks import
let selectedFile = null;

// Handle file input selection
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const importBtn = document.getElementById('import-file');
    const fileMessage = document.getElementById('file-message');
    fileInput.addEventListener('change', evt => {
        selectedFile = evt.target.files[0] || null;
        if (selectedFile) {
            importBtn.disabled = false;
            fileMessage.style.display = 'none';
        } else {
            importBtn.disabled = true;
        }
    });
    importBtn.addEventListener('click', () => {
        if (!selectedFile) return;
        fileMessage.className = 'alert alert-info';
        fileMessage.textContent = 'Importando archivo...';
        fileMessage.style.display = 'block';
        parseFile(selectedFile).then(() => {
            fileMessage.className = 'alert alert-success';
            fileMessage.textContent = 'Cartera importada correctamente.';
            selectedFile = null;
            importBtn.disabled = true;
            // Hide message after delay
            setTimeout(() => { fileMessage.style.display = 'none'; }, 5000);
        }).catch(err => {
            console.error(err);
            fileMessage.className = 'alert alert-danger';
            fileMessage.textContent = 'Error al importar el archivo. Verifique el formato.';
            // Hide message after delay
            setTimeout(() => { fileMessage.style.display = 'none'; }, 7000);
        });
    });
});

// Parse an Excel/CSV file and update global arrays
async function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                // Find sheet named "Inversiones" (case-insensitive) or fallback to first sheet
                let sheetName = workbook.SheetNames.find(name => name.trim().toLowerCase() === 'inversiones');
                if (!sheetName) sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const sheetArr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
                const extracted = [];
                // Rows 3..100 (0-based index) correspond to rows 4..101
                for (let r = 3; r < 101 && r < sheetArr.length; r++) {
                    const row = sheetArr[r];
                    if (!row) continue;
                    const fechaVal = row[22];
                    const indiceVal = row[23];
                    const usdVal = parseFloat(row[25]) || 0;
                    const sharesVal = parseFloat(row[26]) || 0;
                    const precioCompraVal = parseFloat(row[27]) || 0;
                    const precioActualVal = parseFloat(row[30]) || 0;
                    // Skip if no date or index
                    if (!fechaVal || !indiceVal) continue;
                    // Convert date
                    let fechaStr;
                    if (typeof fechaVal === 'string') {
                        fechaStr = fechaVal.split('T')[0];
                    } else {
                        fechaStr = XLSX.SSF.format('yyyy-mm-dd', fechaVal);
                    }
                    const precioActual = precioActualVal || precioCompraVal;
                    const valorActual = precioActual * sharesVal;
                    const rentPct = ((precioActual - precioCompraVal) / (precioCompraVal || 1)) * 100;
                    const rentClp = usdVal * (rentPct / 100) * 950;
                    extracted.push({
                        fecha: fechaStr,
                        indice: indiceVal,
                        usd: usdVal,
                        shares: sharesVal,
                        precio_compra: precioCompraVal,
                        precio_actual: precioActual,
                        valor_actual: valorActual,
                        rentabilidad_pct: rentPct,
                        rentabilidad_clp: rentClp
                    });
                }
                if (extracted.length === 0) {
                    reject(new Error('No se encontraron transacciones en las columnas W–AI del archivo.'));
                    return;
                }
                transactions = extracted;
                // Parse USD purchases: find header row where column 1 contains 'CANT.'
                try {
                    let startRow = -1;
                    for (let r = 0; r < sheetArr.length; r++) {
                        const row = sheetArr[r];
                        if (row && typeof row[1] === 'string' && row[1].trim().toLowerCase() === 'cant.') {
                            startRow = r;
                            break;
                        }
                    }
                    const purchases = [];
                    if (startRow !== -1) {
                        for (let r = startRow + 1; r < sheetArr.length; r++) {
                            const row = sheetArr[r];
                            if (!row) break;
                            const qty = row[1];
                            const dateVal = row[2];
                            const tcVal = row[3];
                            if (qty == null || dateVal == null || tcVal == null || qty === '' || dateVal === '' || tcVal === '') break;
                            const cantidad = parseFloat(qty) || 0;
                            let fecha;
                            if (typeof dateVal === 'string') {
                                fecha = dateVal.split('T')[0];
                            } else {
                                fecha = XLSX.SSF.format('yyyy-mm-dd', dateVal);
                            }
                            const tc = parseFloat(tcVal) || 0;
                            if (cantidad > 0 && tc > 0) {
                                purchases.push({ fecha: fecha, cantidad: cantidad, tc: tc });
                            }
                        }
                    }
                    if (purchases.length > 0) {
                        usdPurchases = purchases;
                        saveUsdPurchases();
                    }
                } catch (ex) {
                    console.warn('Error parsing USD purchases:', ex);
                }
                saveTransactions();
                renderTable();
                renderUsdTable();
                computeSummary();
                computeUsdSummary();
                updateInvestmentChart();
                updateUsdChart();
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = err => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

/* =========================================================================
 *  Modal helpers
 * ========================================================================= */
function resetModal() {
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-edit-index').value = '';
    document.getElementById('transaction-type').value = 'compra';
}
function openAddModal() {
    resetModal();
    document.getElementById('transactionModalLabel').textContent = 'Agregar transacción';
    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    modal.show();
}
function openEditModal(idx) {
    const rec = transactions[idx];
    if (!rec) return;
    resetModal();
    document.getElementById('transactionModalLabel').textContent = 'Editar transacción';
    document.getElementById('transaction-date').value = rec.fecha;
    document.getElementById('transaction-index').value = rec.indice;
    document.getElementById('transaction-usd').value = rec.usd;
    document.getElementById('transaction-shares').value = rec.shares;
    document.getElementById('transaction-precio-compra').value = rec.precio_compra;
    document.getElementById('transaction-precio-actual').value = rec.precio_actual;
    document.getElementById('transaction-edit-index').value = idx;
    document.getElementById('transaction-type').value = rec.shares < 0 ? 'venta' : 'compra';
    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    modal.show();
}
function resetUsdModal() {
    document.getElementById('usd-form').reset();
    document.getElementById('usd-edit-index').value = '';
}
function openAddUsdModal() {
    resetUsdModal();
    document.getElementById('usdModalLabel').textContent = 'Agregar compra USD';
    const modal = new bootstrap.Modal(document.getElementById('usdModal'));
    modal.show();
}
function openEditUsdModal(idx) {
    const rec = usdPurchases[idx];
    if (!rec) return;
    resetUsdModal();
    document.getElementById('usdModalLabel').textContent = 'Editar compra USD';
    document.getElementById('usd-date').value = rec.fecha;
    document.getElementById('usd-amount').value = rec.cantidad;
    document.getElementById('usd-tc').value = rec.tc;
    document.getElementById('usd-edit-index').value = idx;
    const modal = new bootstrap.Modal(document.getElementById('usdModal'));
    modal.show();
}

/* =========================================================================
 *  Save handlers
 * ========================================================================= */
function saveTransactionFromModal() {
    const fecha = document.getElementById('transaction-date').value;
    const indice = document.getElementById('transaction-index').value.trim();
    const usdVal = parseFloat(document.getElementById('transaction-usd').value) || 0;
    const sharesVal = parseFloat(document.getElementById('transaction-shares').value) || 0;
    const precioCompraVal = parseFloat(document.getElementById('transaction-precio-compra').value) || 0;
    let precioActualVal = parseFloat(document.getElementById('transaction-precio-actual').value);
    const tipo = document.getElementById('transaction-type').value;
    if (!fecha || !indice || !usdVal || !sharesVal || !precioCompraVal) {
        alert('Todos los campos obligatorios deben completarse.');
        return;
    }
    let usd = usdVal;
    let shares = sharesVal;
    if (tipo === 'venta') {
        usd = -Math.abs(usdVal);
        shares = -Math.abs(sharesVal);
    }
    if (!precioActualVal) precioActualVal = precioCompraVal;
    const valorActual = precioActualVal * shares;
    const rentPct = ((precioActualVal - precioCompraVal) / (precioCompraVal || 1)) * 100;
    const rentClp = usd * (rentPct / 100) * 950;
    const record = {
        fecha: fecha,
        indice: indice,
        usd: usd,
        shares: shares,
        precio_compra: precioCompraVal,
        precio_actual: precioActualVal,
        valor_actual: valorActual,
        rentabilidad_pct: rentPct,
        rentabilidad_clp: rentClp
    };
    const editIdxStr = document.getElementById('transaction-edit-index').value;
    if (editIdxStr) {
        const editIdx = parseInt(editIdxStr);
        transactions[editIdx] = record;
    } else {
        transactions.push(record);
    }
    saveTransactions();
    renderTable();
    updateInvestmentChart();
    generateAlerts();
    const modalEl = document.getElementById('transactionModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

function saveUsdFromModal() {
    const fecha = document.getElementById('usd-date').value;
    const cantidad = parseFloat(document.getElementById('usd-amount').value) || 0;
    const tc = parseFloat(document.getElementById('usd-tc').value) || 0;
    if (!fecha || !cantidad || !tc) {
        alert('Todos los campos deben completarse.');
        return;
    }
    const rec = { fecha, cantidad, tc };
    const editIdxStr = document.getElementById('usd-edit-index').value;
    if (editIdxStr) {
        const editIdx = parseInt(editIdxStr);
        usdPurchases[editIdx] = rec;
    } else {
        usdPurchases.push(rec);
    }
    saveUsdPurchases();
    renderUsdTable();
    const modalEl = document.getElementById('usdModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

/* =========================================================================
 *  Initialisation
 * ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Load data
    loadTransactions();
    loadUsdPurchases();
    // Render initial UI
    renderTable();
    renderUsdTable();
    computeSummary();
    computeUsdSummary();
    updateInvestmentChart();
    updateUsdChart();
    // Attach event handlers
    document.getElementById('update-prices').addEventListener('click', () => {
        updateRealTimePrices();
    });
    document.getElementById('add-transaction').addEventListener('click', () => {
        openAddModal();
    });
    document.getElementById('save-transaction').addEventListener('click', () => {
        saveTransactionFromModal();
    });
    document.getElementById('add-usd').addEventListener('click', () => {
        openAddUsdModal();
    });
    document.getElementById('save-usd').addEventListener('click', () => {
        saveUsdFromModal();
    });
    generateAlerts();
});