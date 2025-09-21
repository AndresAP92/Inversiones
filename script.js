// Sample default data to illustrate functionality.
// Each record contains:
// fecha (string, YYYY-MM-DD), indice (string), usd (number), shares (number),
// precio_compra (number), precio_actual (number), valor_actual (number),
// rentabilidad_pct (number), rentabilidad_clp (number)
let transactions = [
    {
        fecha: '2025-01-15',
        indice: 'AAPL',
        usd: 10000,
        shares: 50,
        precio_compra: 200,
        precio_actual: 250,
        valor_actual: 50 * 250,
        rentabilidad_pct: ((250 - 200) / 200) * 100,
        rentabilidad_clp: 10000 * (((250 - 200) / 200)) * 950
    },
    {
        fecha: '2025-02-01',
        indice: 'MSFT',
        usd: 8000,
        shares: 40,
        precio_compra: 150,
        precio_actual: 140,
        valor_actual: 40 * 140,
        rentabilidad_pct: ((140 - 150) / 150) * 100,
        rentabilidad_clp: 8000 * (((140 - 150) / 150)) * 950
    }
];

let dataTable;

// Configuration for real-time quote provider.
// A stock price provider is required to fetch up-to-date values for your portfolio.
// By default we use Alpha Vantage and set your personal API key below. If you
// prefer to use a different provider (e.g. Finnhub), change REALTIME_PROVIDER
// to 'finnhub' and provide your Finnhub API token in API_KEY.
// You can switch between different real‑time price providers by changing
// REALTIME_PROVIDER. Supported options:
//   - 'alphavantage': use the legacy Alpha Vantage REST API (requires API key)
//   - 'finnhub': use the Finnhub REST API (requires API key)
//   - 'alphavantage_mcp': use the Alpha Vantage MCP server via JSON‑RPC.
//     This option leverages your Alpha Vantage API key and the MCP endpoint
//     to fetch realtime quotes through the Model Context Protocol. See
//     README for details.
const REALTIME_PROVIDER = 'alphavantage_mcp';
// API key provided by the user. For security reasons, avoid hard-coding
// keys into publicly accessible repos. Here it is set so the page can
// request prices automatically when run locally. If you wish to override
// this at runtime without editing the source, consider exposing it via a
// configuration input on the page or loading it from an environment variable.
const API_KEY = 'DWLYG2EU64I39MR7';

/**
 * Fetch the latest price for a given ticker from the selected provider.
 * This function returns a promise that resolves to the latest price (number).
 *
 * Note: You must provide your own API key above. Most providers impose
 *       rate limits. For example, Alpha Vantage allows 5 requests per minute
 *       on the free tier. Finnhub allows 60 requests per minute.
 *
 * @param {string} ticker Stock symbol (e.g., 'AAPL').
 * @returns {Promise<number|null>} Latest price or null if unavailable.
 */
async function fetchLatestPrice(ticker) {
    try {
        let url;
        // Choose provider based on REALTIME_PROVIDER constant
        if (REALTIME_PROVIDER === 'alphavantage') {
            // Alpha Vantage GLOBAL_QUOTE endpoint (classic REST API)
            url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${API_KEY}`;
            const resp = await fetch(url);
            const json = await resp.json();
            if (json && json['Global Quote'] && json['Global Quote']['05. price']) {
                return parseFloat(json['Global Quote']['05. price']);
            }
        } else if (REALTIME_PROVIDER === 'finnhub') {
            // Finnhub quote endpoint
            url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${API_KEY}`;
            const resp = await fetch(url);
            const json = await resp.json();
            if (json && json.c) {
                // Finnhub returns current price in field 'c'
                return parseFloat(json.c);
            }
        } else if (REALTIME_PROVIDER === 'alphavantage_mcp') {
            // Alpha Vantage MCP server via JSON‑RPC. We attempt to call
            // the REALTIME_BULK_QUOTES tool for a single symbol. The MCP
            // server requires HTTP POST with JSON‑RPC body and Accept header.
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
            // If the server returns an SSE stream, attempt to read it as text.
            // Otherwise parse JSON normally.
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('text/event-stream')) {
                // For SSE, read the stream and parse the JSON once received.
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    // SSE events are separated by two CRLFs and start with 'data: '
                    const events = buffer.split('\n\n');
                    for (const ev of events) {
                        const trimmed = ev.trim();
                        if (trimmed.startsWith('data:')) {
                            const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
                            try {
                                const message = JSON.parse(jsonStr);
                                if (message?.result) {
                                    const quotes = message.result?.content?.[0]?.text || '';
                                    // parse quotes if returned as string
                                    // Fall back to JSON parsing below
                                }
                            } catch (ex) {
                                // ignore parse errors
                            }
                        }
                    }
                }
            }
            // Fallback: parse JSON response
            const json = await resp.json();
            if (json?.result?.content && Array.isArray(json.result.content) && json.result.content.length > 0) {
                // The content field may be an array of messages. Each message can
                // contain text with the bulk quotes data. We'll attempt to extract
                // the price for the first symbol.
                const content = json.result.content[0];
                if (content.type === 'json' && content.json) {
                    // If returned as structured JSON, expect result like
                    // { "AAPL": { "price": 123.45, ... } }
                    const price = content.json?.[ticker]?.price;
                    if (price !== undefined) return parseFloat(price);
                } else if (content.type === 'text' && typeof content.text === 'string') {
                    try {
                        const data = JSON.parse(content.text);
                        if (data?.[ticker]?.price !== undefined) {
                            return parseFloat(data[ticker].price);
                        }
                    } catch (ex) {
                        // Not JSON; attempt to parse simple patterns like "AAPL: 123.45"
                        const match = content.text.match(/([\d.]+)/);
                        if (match) return parseFloat(match[1]);
                    }
                }
            }
        }
        return null;
    } catch (err) {
        console.error('Error fetching price for', ticker, err);
        return null;
    }
}

/**
 * Update real-time prices for all transactions.
 * Iterates over each unique ticker in the transactions array, fetches the
 * latest price, updates the corresponding records, recomputes derived values,
 * and refreshes the table and summary. Also generates basic suggestions.
 */
async function updateRealTimePrices() {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
        alert('Por favor configure su API key en script.js para obtener precios en tiempo real.');
        return;
    }
    const tickers = [...new Set(transactions.map(t => t.indice))];
    const priceMap = {};
    // Fetch prices sequentially to respect API rate limits
    for (const ticker of tickers) {
        const price = await fetchLatestPrice(ticker);
        if (price !== null) {
            priceMap[ticker] = price;
        }
        // Wait briefly (e.g., 12 seconds) between calls if using Alpha Vantage to comply with rate limits
        if (REALTIME_PROVIDER === 'alphavantage') {
            await new Promise(resolve => setTimeout(resolve, 12000));
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    // Update transactions with new prices
    transactions = transactions.map(rec => {
        const newPrice = priceMap[rec.indice] || rec.precio_actual;
        const updated = { ...rec };
        updated.precio_actual = newPrice;
        updated.valor_actual = newPrice * rec.shares;
        updated.rentabilidad_pct = ((updated.precio_actual - rec.precio_compra) / (rec.precio_compra || 1)) * 100;
        updated.rentabilidad_clp = rec.usd * (updated.rentabilidad_pct / 100) * 950;
        return updated;
    });
    renderTable();
    generateAlerts();
}

/**
 * Generate simple alerts/suggestions based on current rentability.
 * This function populates the #alerts-list element with messages when
 * certain thresholds are crossed. Adjust thresholds as desired.
 */
function generateAlerts() {
    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';
    transactions.forEach(rec => {
        let message = null;
        if (rec.rentabilidad_pct > 20) {
            message = `${rec.indice}: la rentabilidad ha superado el 20%. Podría considerar tomar ganancias.`;
        } else if (rec.rentabilidad_pct < -10) {
            message = `${rec.indice}: la rentabilidad es inferior a -10%. Revise si aún conviene mantener la posición.`;
        }
        if (message) {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = message;
            alertsList.appendChild(li);
        }
    });
    if (alertsList.children.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = 'No hay alertas en este momento.';
        alertsList.appendChild(li);
    }
}

function formatNumber(num, decimals = 2) {
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function computeSummary() {
    let totalInvested = 0;
    let totalValue = 0;
    let totalRentCLP = 0;
    transactions.forEach(rec => {
        totalInvested += rec.usd || 0;
        totalValue += rec.valor_actual || 0;
        totalRentCLP += rec.rentabilidad_clp || 0;
    });
    let rentPct = totalInvested ? ((totalValue - totalInvested) / totalInvested * 100) : 0;
    // Update DOM
    document.getElementById('total-invested').textContent = '$' + formatNumber(totalInvested);
    document.getElementById('total-value').textContent = '$' + formatNumber(totalValue);
    document.getElementById('rentabilidad-pct').textContent = formatNumber(rentPct) + '%';
    document.getElementById('rentabilidad-clp').textContent = '$' + formatNumber(totalRentCLP, 0);
}

function renderTable() {
    // Destroy existing table if exists
    if (dataTable) {
        dataTable.destroy();
        $('#transactions-table tbody').empty();
    }
    // Populate tbody
    const tbody = document.querySelector('#transactions-table tbody');
    transactions.forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rec.fecha}</td>
            <td>${rec.indice}</td>
            <td>${formatNumber(rec.usd)}</td>
            <td>${formatNumber(rec.shares)}</td>
            <td>${formatNumber(rec.precio_compra)}</td>
            <td>${formatNumber(rec.precio_actual)}</td>
            <td>${formatNumber(rec.valor_actual)}</td>
            <td>${formatNumber(rec.rentabilidad_pct)}%</td>
            <td>${formatNumber(rec.rentabilidad_clp, 0)}</td>
        `;
        tbody.appendChild(tr);
    });
    // Initialize DataTable
    dataTable = $('#transactions-table').DataTable({
        order: [[0, 'desc']],
        pageLength: 25
    });
    // Compute summary after table update
    computeSummary();
}

function parseFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        let workbook;
        try {
            workbook = XLSX.read(data, { type: 'array' });
        } catch (err) {
            alert('No se pudo leer el archivo. Asegúrese de que sea un archivo Excel válido.');
            return;
        }
        // Try to find sheet named 'inversiones'
        let sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'inversiones');
        if (!sheetName) {
            // fallback to first sheet
            sheetName = workbook.SheetNames[0];
        }
        const sheet = workbook.Sheets[sheetName];
        // Convert sheet to array of arrays
        const sheetArr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        // Extract rows 4 to 101 (1-based indexing in Sheets). In JS 0-based indexing, rows 3..100 inclusive.
        const extracted = [];
        for (let r = 3; r < 101 && r < sheetArr.length; r++) {
            const row = sheetArr[r];
            if (!row) continue;
            // Extract specific columns: W (22), X (23), Z (25), AA (26), AB (27), AE (30), AF (31), AH (33), AI (34)
            const fecha = row[22] || row[22] === 0 ? row[22] : null;
            const indice = row[23] || null;
            const usd = parseFloat(row[25]) || 0;
            const shares = parseFloat(row[26]) || 0;
            const precio_compra = parseFloat(row[27]) || 0;
            const precio_actual = parseFloat(row[30]) || 0;
            const valor_actual = parseFloat(row[31]) || (shares * precio_actual);
            const rentabilidad_pct = parseFloat(row[33]) || ((precio_actual - precio_compra) / (precio_compra || 1)) * 100;
            const rentabilidad_clp = parseFloat(row[34]) || (usd * (rentabilidad_pct / 100) * 950);
            // Skip rows that don't have a date or index
            if (!fecha || !indice) continue;
            extracted.push({
                fecha: typeof fecha === 'string' ? fecha.split('T')[0] : XLSX.SSF.format("yyyy-mm-dd", fecha),
                indice: indice,
                usd: usd,
                shares: shares,
                precio_compra: precio_compra,
                precio_actual: precio_actual,
                valor_actual: valor_actual,
                rentabilidad_pct: rentabilidad_pct,
                rentabilidad_clp: rentabilidad_clp
            });
        }
        if (extracted.length === 0) {
            alert('No se encontraron transacciones en el rango esperado. Verifique que la hoja contenga datos en las columnas W a AI.');
            return;
        }
        transactions = extracted;
        renderTable();
    };
    reader.readAsArrayBuffer(file);
}

document.addEventListener('DOMContentLoaded', function () {
    renderTable();
    document.getElementById('file-input').addEventListener('change', function (evt) {
        const file = evt.target.files[0];
        if (!file) return;
        parseFile(file);
    });
    document.getElementById('update-prices').addEventListener('click', function () {
        updateRealTimePrices();
    });
    // Optionally, run periodic price updates (e.g., every 30 minutes)
    // setInterval(updateRealTimePrices, 1800000);
    generateAlerts();
});