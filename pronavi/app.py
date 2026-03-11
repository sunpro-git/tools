import json
import os
import tempfile
import uuid

from flask import Flask, flash, redirect, render_template, request, url_for
from dotenv import load_dotenv

from db import (
    get_connection, get_all_staff, get_or_create_staff,
    get_existing_codes, insert_point
)
from excel_parser import (
    parse_excel, build_point_record, SECTION_NAMES, CATEGORY_NAMES
)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret')

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), 'pronavi_uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.route('/')
def index():
    return render_template('upload.html')


@app.route('/preview', methods=['POST'])
def preview():
    file = request.files.get('excel_file')
    if not file or not file.filename:
        flash('ファイルを選択してください', 'error')
        return redirect(url_for('index'))

    try:
        records = parse_excel(file)
    except Exception as e:
        flash(f'ファイルの読み込みに失敗しました: {e}', 'error')
        return redirect(url_for('index'))

    # Get existing codes for duplicate check
    try:
        conn = get_connection()
        existing_codes = get_existing_codes(conn)
        conn.close()
    except Exception as e:
        flash(f'DB接続エラー: {e}', 'error')
        return redirect(url_for('index'))

    preview_data = []
    skipped = []
    duplicate_count = 0

    for i, row in enumerate(records):
        point, skip_reason = build_point_record(row)
        if point is None:
            skipped.append({
                'row': i + 2,
                'reason': skip_reason,
                'title': str(row.get('顧客名', ''))
            })
            continue

        if point['CODE'] and point['CODE'] in existing_codes:
            duplicate_count += 1
            continue

        preview_data.append(point)

    # Save to temp file
    batch_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f'{batch_id}.json')
    with open(temp_path, 'w', encoding='utf-8') as f:
        json.dump(preview_data, f, ensure_ascii=False, default=str)

    return render_template('preview.html',
                           data=preview_data,
                           skipped=skipped,
                           duplicates=duplicate_count,
                           batch_id=batch_id,
                           total=len(records),
                           valid=len(preview_data),
                           section_names=SECTION_NAMES,
                           category_names=CATEGORY_NAMES)


@app.route('/insert', methods=['POST'])
def insert():
    batch_id = request.form.get('batch_id')
    if not batch_id:
        flash('不正なリクエストです', 'error')
        return redirect(url_for('index'))

    temp_path = os.path.join(UPLOAD_DIR, f'{batch_id}.json')
    if not os.path.exists(temp_path):
        flash('プレビューデータが見つかりません。もう一度アップロードしてください。', 'error')
        return redirect(url_for('index'))

    with open(temp_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conn = get_connection()
    staff_cache = get_all_staff(conn)
    initial_staff_count = len(staff_cache)

    # Get existing codes again for safety
    existing_codes = get_existing_codes(conn)

    results = {
        'success': 0,
        'skipped': 0,
        'error': 0,
        'errors': [],
        'new_staff': [],
    }

    for row in data:
        try:
            # Duplicate check
            if row['CODE'] and row['CODE'] in existing_codes:
                results['skipped'] += 1
                continue

            # Resolve staff
            staff_id = get_or_create_staff(conn, row['STAFF_RAW'], staff_cache)
            if staff_id is None:
                staff_id = 1  # fallback

            row['STAFF_ID'] = staff_id
            insert_point(conn, row)
            existing_codes.add(row['CODE'])
            results['success'] += 1

        except Exception as e:
            results['error'] += 1
            results['errors'].append({
                'title': row.get('TITLE', ''),
                'message': str(e)
            })

    conn.close()

    # Identify newly created staff
    if len(staff_cache) > initial_staff_count:
        new_keys = list(staff_cache.keys())[initial_staff_count:]
        results['new_staff'] = [f'{last} {first}' for last, first in new_keys]

    # Cleanup temp file
    try:
        os.remove(temp_path)
    except OSError:
        pass

    return render_template('result.html', results=results)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
