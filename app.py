from flask import Flask, render_template, request, jsonify
import openpyxl
from openpyxl.styles import Font
import os
from datetime import datetime

app = Flask(__name__)

EXCEL_FILE = os.path.join(os.path.dirname(__file__), 'สต๊อกสินค้า ปาร์คอิน.xlsx')
DATA_START_ROW = 3  # Row 1=headers, Row 2=category label, data from row 3

DATA_FONT = Font(name='Sarabun', size=16)

HEADER_NAMES = {
    'A': 'ลำดับ',
    'B': 'บาร์โค้ดสินค้า',
    'C': 'ประเภทสินค้าหลัก',
    'D': 'ประเภทสินค้าย่อย',
    'E': 'ชื่อสินค้า',
    'F': 'Brand',
    'G': 'Lab',
    'H': 'Lot',
    'I': 'วันหมดอายุ',
    'J': 'สต๊อกตั้งต้น',
    'K': 'สต๊อกคงเหลือ ณ ปัจจุบัน',
}


def load_workbook_data():
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    return wb


def get_sheet_data(sheet_name=None):
    wb = load_workbook_data()
    if sheet_name and sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
    else:
        ws = wb.active
        sheet_name = ws.title

    items = []
    for row_idx in range(DATA_START_ROW, ws.max_row + 1):
        row = ws[row_idx]
        # Skip completely empty rows
        values = [cell.value for cell in row[:11]]
        if all(v is None for v in values):
            continue
        # Skip rows where name (col E) is empty
        name_val = row[4].value
        if not name_val:
            continue

        expiry = row[8].value
        if isinstance(expiry, datetime):
            expiry_str = expiry.strftime('%Y-%m-%d')
        elif expiry:
            expiry_str = str(expiry)
        else:
            expiry_str = ''

        initial_stock = row[9].value
        current_stock = row[10].value

        # Handle formula values that might be None
        try:
            initial_stock = float(initial_stock) if initial_stock is not None else 0
        except (ValueError, TypeError):
            initial_stock = 0

        try:
            current_stock = float(current_stock) if current_stock is not None else initial_stock
        except (ValueError, TypeError):
            current_stock = initial_stock

        raw_index = row[0].value
        item = {
            'row': row_idx,
            'sheet': sheet_name,
            'index': int(raw_index) if isinstance(raw_index, (int, float)) else raw_index,
            'barcode': str(row[1].value) if row[1].value is not None else '',
            'main_category': str(row[2].value) if row[2].value else '',
            'sub_category': str(row[3].value) if row[3].value else '',
            'name': str(name_val),
            'brand': str(row[5].value) if row[5].value else '',
            'lab': str(row[6].value) if row[6].value else '',
            'lot': str(row[7].value) if row[7].value else '',
            'expiry': expiry_str,
            'initial_stock': int(initial_stock),
            'current_stock': int(current_stock),
        }
        items.append(item)

    return items, wb.sheetnames


def set_row_font(ws, row_idx, num_cols=11):
    for col in range(1, num_cols + 1):
        ws.cell(row=row_idx, column=col).font = DATA_FONT


def save_item_to_excel(sheet_name, row_idx, data):
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb[sheet_name]

    expiry_val = None
    if data.get('expiry'):
        try:
            expiry_val = datetime.strptime(data['expiry'], '%Y-%m-%d')
        except ValueError:
            expiry_val = data['expiry']

    ws.cell(row=row_idx, column=1).value = data.get('index', row_idx - 2)
    ws.cell(row=row_idx, column=2).value = data.get('barcode', '')
    ws.cell(row=row_idx, column=3).value = data.get('main_category', '')
    ws.cell(row=row_idx, column=4).value = data.get('sub_category', '')
    ws.cell(row=row_idx, column=5).value = data.get('name', '')
    ws.cell(row=row_idx, column=6).value = data.get('brand', '')
    ws.cell(row=row_idx, column=7).value = data.get('lab', '')
    ws.cell(row=row_idx, column=8).value = data.get('lot', '')
    ws.cell(row=row_idx, column=9).value = expiry_val
    ws.cell(row=row_idx, column=10).value = int(data.get('initial_stock', 0))
    ws.cell(row=row_idx, column=11).value = int(data.get('current_stock', 0))
    set_row_font(ws, row_idx)

    save_excel_safe(wb)


def add_item_to_excel(sheet_name, data):
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb[sheet_name]

    # Find the next empty row after existing data
    last_row = ws.max_row
    while last_row >= DATA_START_ROW:
        row_vals = [ws.cell(row=last_row, column=c).value for c in range(1, 12)]
        if any(v is not None for v in row_vals):
            break
        last_row -= 1
    new_row = last_row + 1

    # Auto-assign index
    max_index = 0
    for r in range(DATA_START_ROW, new_row):
        idx_val = ws.cell(row=r, column=1).value
        if idx_val and isinstance(idx_val, (int, float)):
            max_index = max(max_index, int(idx_val))
    new_index = max_index + 1

    expiry_val = None
    if data.get('expiry'):
        try:
            expiry_val = datetime.strptime(data['expiry'], '%Y-%m-%d')
        except ValueError:
            expiry_val = data['expiry']

    ws.cell(row=new_row, column=1).value = new_index
    ws.cell(row=new_row, column=2).value = data.get('barcode', '')
    ws.cell(row=new_row, column=3).value = data.get('main_category', '')
    ws.cell(row=new_row, column=4).value = data.get('sub_category', '')
    ws.cell(row=new_row, column=5).value = data.get('name', '')
    ws.cell(row=new_row, column=6).value = data.get('brand', '')
    ws.cell(row=new_row, column=7).value = data.get('lab', '')
    ws.cell(row=new_row, column=8).value = data.get('lot', '')
    ws.cell(row=new_row, column=9).value = expiry_val
    ws.cell(row=new_row, column=10).value = int(data.get('initial_stock', 0))
    ws.cell(row=new_row, column=11).value = int(data.get('current_stock', data.get('initial_stock', 0)))
    set_row_font(ws, new_row)

    save_excel_safe(wb)
    return new_row, new_index


def delete_item_from_excel(sheet_name, row_idx):
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb[sheet_name]
    ws.delete_rows(row_idx)
    try:
        wb.save(EXCEL_FILE)
    except PermissionError:
        raise PermissionError('ไฟล์ Excel ถูกเปิดอยู่ กรุณาปิด Excel แล้วลองใหม่')


def save_excel_safe(wb):
    try:
        wb.save(EXCEL_FILE)
    except PermissionError:
        raise PermissionError('ไฟล์ Excel ถูกเปิดอยู่ กรุณาปิด Excel แล้วลองใหม่')


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.errorhandler(Exception)
def handle_exception(e):
    msg = str(e)
    if isinstance(e, PermissionError):
        return jsonify({'success': False, 'error': msg}), 423
    return jsonify({'success': False, 'error': msg}), 500

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/sheets')
def get_sheets():
    wb = load_workbook_data()
    return jsonify({'sheets': wb.sheetnames})


@app.route('/api/items')
def get_items():
    sheet = request.args.get('sheet', None)
    items, sheets = get_sheet_data(sheet)

    # Build category tree
    categories = {}
    for item in items:
        mc = item['main_category']
        sc = item['sub_category']
        if mc not in categories:
            categories[mc] = set()
        if sc:
            categories[mc].add(sc)
    cat_tree = {k: sorted(list(v)) for k, v in sorted(categories.items())}

    return jsonify({
        'items': items,
        'categories': cat_tree,
        'sheets': sheets,
    })


@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.get_json()
    sheet = data.pop('sheet', None)
    sheets = load_workbook_data().sheetnames
    if not sheet or sheet not in sheets:
        sheet = sheets[0]

    new_row, new_index = add_item_to_excel(sheet, data)
    return jsonify({'success': True, 'row': new_row, 'index': new_index, 'sheet': sheet})


@app.route('/api/items/<int:row>', methods=['PUT'])
def update_item(row):
    data = request.get_json()
    sheet = request.args.get('sheet') or data.pop('sheet', None)
    sheets = load_workbook_data().sheetnames
    if not sheet or sheet not in sheets:
        sheet = sheets[0]
    save_item_to_excel(sheet, row, data)
    return jsonify({'success': True})


@app.route('/api/items/<int:row>', methods=['DELETE'])
def delete_item(row):
    sheet = request.args.get('sheet')
    sheets = load_workbook_data().sheetnames
    if not sheet or sheet not in sheets:
        sheet = sheets[0]
    delete_item_from_excel(sheet, row)
    return jsonify({'success': True})


@app.route('/api/normalize-fonts', methods=['POST'])
def normalize_fonts():
    wb = openpyxl.load_workbook(EXCEL_FILE)
    fixed = 0
    for ws in wb.worksheets:
        for row_idx in range(DATA_START_ROW, ws.max_row + 1):
            for col in range(1, 12):
                cell = ws.cell(row=row_idx, column=col)
                if cell.value is not None:
                    current = cell.font
                    if current.name != DATA_FONT.name or current.size != DATA_FONT.size or current.bold:
                        cell.font = DATA_FONT
                        fixed += 1
    save_excel_safe(wb)
    return jsonify({'success': True, 'cells_fixed': fixed})


@app.route('/api/stats')
def get_stats():
    sheet = request.args.get('sheet', None)
    items, _ = get_sheet_data(sheet)

    total = len(items)
    low_stock = sum(1 for i in items if i['current_stock'] <= 10)
    out_of_stock = sum(1 for i in items if i['current_stock'] <= 0)

    today = datetime.now()
    expiring_soon = 0
    for i in items:
        if i['expiry']:
            try:
                exp = datetime.strptime(i['expiry'], '%Y-%m-%d')
                days_left = (exp - today).days
                if 0 < days_left <= 90:
                    expiring_soon += 1
            except ValueError:
                pass

    return jsonify({
        'total': total,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        'expiring_soon': expiring_soon,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
