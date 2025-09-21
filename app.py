import os
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, flash


def load_transactions(file_path: str) -> pd.DataFrame:
    """
    Load the inversiones transactions from an Excel or CSV file.

    The expected columns are:

    - fecha_transaccion (date)
    - indice (stock/index name)
    - usd (USD transacted)
    - shares (number of shares)
    - precio_compra (price at purchase or initial price)
    - precio_actual (current price or sale price)
    - valor_actual (current value = shares * current price)
    - rentabilidad_pct (percentage return)
    - rentabilidad_clp (profit/loss in CLP)

    If some of these columns are missing, the function will try to infer or
    create them using available data. Unknown columns will be ignored.

    Args:
        file_path: Path to the uploaded file.

    Returns:
        A pandas DataFrame with the required columns.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".xlsx", ".xlsm", ".xls"]:
        # Attempt to locate a sheet named 'inversiones' (case-insensitive)
        xls = pd.ExcelFile(file_path)
        sheet_name = None
        for s in xls.sheet_names:
            if s.strip().lower() == "inversiones":
                sheet_name = s
                break
        if sheet_name is None:
            # default to first sheet
            sheet_name = xls.sheet_names[0]
        df = pd.read_excel(file_path, sheet_name=sheet_name)
    else:
        df = pd.read_csv(file_path)

    # Normalize column names
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Map expected columns
    col_map = {
        "fecha transaccion": "fecha_transaccion",
        "fecha": "fecha_transaccion",
        "indice": "indice",
        "index": "indice",
        "usd transaccionados": "usd",
        "usd": "usd",
        "cantidad de shares": "shares",
        "shares": "shares",
        "n° acciones": "shares",
        "cantidad": "shares",
        "precio accion": "precio_compra",
        "precio acción": "precio_compra",
        "precio": "precio_compra",
        "precio actual": "precio_actual",
        "precio venta": "precio_actual",
        "valor actual": "valor_actual",
        "rentabilidad %": "rentabilidad_pct",
        "rentabilidad en el periodo %": "rentabilidad_pct",
        "% rentabilidad": "rentabilidad_pct",
        "rentabilidad": "rentabilidad_pct",
        "rentabilidad clp": "rentabilidad_clp",
        "rentabilidad en el periodo clp": "rentabilidad_clp",
    }

    data = {}
    for orig_col, new_col in col_map.items():
        for col in df.columns:
            if orig_col == col:
                data[new_col] = df[col]

    # Create DataFrame with required columns, fill missing with default or computed values
    out = pd.DataFrame()
    out['fecha_transaccion'] = pd.to_datetime(data.get('fecha_transaccion', pd.NaT))
    out['indice'] = data.get('indice', pd.NA)
    out['usd'] = pd.to_numeric(data.get('usd', 0), errors='coerce')
    out['shares'] = pd.to_numeric(data.get('shares', 0), errors='coerce')
    out['precio_compra'] = pd.to_numeric(data.get('precio_compra', 0), errors='coerce')
    out['precio_actual'] = pd.to_numeric(data.get('precio_actual', 0), errors='coerce')
    # Compute valor_actual if not present
    if 'valor_actual' in data:
        out['valor_actual'] = pd.to_numeric(data['valor_actual'], errors='coerce')
    else:
        out['valor_actual'] = out['shares'] * out['precio_actual']
    # Compute rentabilidad_pct if not present
    if 'rentabilidad_pct' in data:
        out['rentabilidad_pct'] = pd.to_numeric(data['rentabilidad_pct'], errors='coerce')
    else:
        # (precio_actual - precio_compra)/precio_compra
        with pd.option_context('mode.use_inf_as_na', True):
            out['rentabilidad_pct'] = (out['precio_actual'] - out['precio_compra']) / out['precio_compra'] * 100
    # Compute rentabilidad_clp if not present (use usd and return percentage)
    if 'rentabilidad_clp' in data:
        out['rentabilidad_clp'] = pd.to_numeric(data['rentabilidad_clp'], errors='coerce')
    else:
        # Convert USD to CLP approximate using 1 USD = 950 CLP (rough estimate)
        # This conversion factor can be refined later or retrieved from an API.
        usd_to_clp = 950
        out['rentabilidad_clp'] = out['usd'] * (out['rentabilidad_pct'] / 100) * usd_to_clp
    return out


def create_app():
    app = Flask(__name__)
    app.secret_key = 'super-secret-key'  # replace with a random secret in production

    # Load default data from sample or previously uploaded file
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    DEFAULT_FILE = os.path.join(DATA_DIR, 'transactions.csv')
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    if not os.path.exists(DEFAULT_FILE):
        # Create a minimal sample CSV if none exists
        sample = pd.DataFrame({
            'fecha_transaccion': pd.to_datetime(['2025-01-01', '2025-02-10']),
            'indice': ['AAPL', 'GOOGL'],
            'usd': [10000, 15000],
            'shares': [50, 30],
            'precio_compra': [200, 500],
            'precio_actual': [250, 480],
        })
        sample['valor_actual'] = sample['shares'] * sample['precio_actual']
        sample['rentabilidad_pct'] = (sample['precio_actual'] - sample['precio_compra']) / sample['precio_compra'] * 100
        sample['rentabilidad_clp'] = sample['usd'] * (sample['rentabilidad_pct'] / 100) * 950
        sample.to_csv(DEFAULT_FILE, index=False)

    # global variable to hold transactions DataFrame
    app.config['transactions'] = load_transactions(DEFAULT_FILE)

    @app.route('/')
    def index():
        df: pd.DataFrame = app.config['transactions']
        # compute portfolio summary
        total_invested = df['usd'].fillna(0).sum()
        total_value = df['valor_actual'].fillna(0).sum()
        total_rentability_clp = df['rentabilidad_clp'].fillna(0).sum()
        total_rentability_pct = ((total_value - total_invested) / total_invested * 100) if total_invested else 0
        summary = {
            'total_invested': total_invested,
            'total_value': total_value,
            'total_rentability_clp': total_rentability_clp,
            'total_rentability_pct': total_rentability_pct,
        }
        return render_template('index.html', summary=summary)

    @app.route('/transactions')
    def transactions():
        df: pd.DataFrame = app.config['transactions']
        # convert DataFrame to list of dicts for template rendering
        data = df.to_dict(orient='records')
        return render_template('transactions.html', data=data)

    @app.route('/upload', methods=['GET', 'POST'])
    def upload():
        if request.method == 'POST':
            file = request.files.get('file')
            if not file:
                flash('Please select a file.')
                return redirect(request.url)
            # Save uploaded file to data directory
            filename = file.filename
            upload_path = os.path.join(DATA_DIR, filename)
            file.save(upload_path)
            try:
                df = load_transactions(upload_path)
                app.config['transactions'] = df
                # Overwrite default file for persistence
                df.to_csv(DEFAULT_FILE, index=False)
                flash('File uploaded and data loaded successfully.')
                return redirect(url_for('transactions'))
            except Exception as e:
                flash(f'Error processing file: {e}')
                return redirect(request.url)
        return render_template('upload.html')

    return app


if __name__ == '__main__':
    # Only run the development server if executed directly
    app = create_app()
    app.run(host='0.0.0.0', port=8050, debug=True)