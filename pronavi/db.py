import pymssql
import os
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return pymssql.connect(
        server=os.getenv('DB_SERVER'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        charset='utf8'
    )


def parse_staff_name(raw):
    """Parse '791665:須山　尊徳' -> (last_name, first_name)"""
    if not raw:
        return '', ''
    raw = str(raw)
    if ':' in raw:
        raw = raw.split(':', 1)[1]
    # full-width space
    parts = raw.strip().split('\u3000')
    if len(parts) >= 2:
        return parts[0], parts[1]
    # half-width space
    parts = raw.strip().split(' ')
    if len(parts) >= 2:
        return parts[0], parts[1]
    return raw.strip(), ''


def get_all_staff(conn):
    """Get all staff as {(last_name, first_name): id} dict."""
    cursor = conn.cursor()
    cursor.execute("SELECT ID, LAST_NAME, FIRST_NAME FROM STAFF")
    return {(row[1], row[2]): row[0] for row in cursor.fetchall()}


def create_staff(conn, last_name, first_name):
    """Insert new staff and return the new ID."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO STAFF (LAST_NAME, FIRST_NAME, STATUS, CREATED_AT) "
        "VALUES (%s, %s, N'active', GETDATE())",
        (last_name, first_name)
    )
    cursor.execute("SELECT SCOPE_IDENTITY()")
    new_id = int(cursor.fetchone()[0])
    conn.commit()
    return new_id


def get_or_create_staff(conn, raw_name, staff_cache):
    """Lookup or create staff. Uses staff_cache to avoid repeated queries."""
    last_name, first_name = parse_staff_name(raw_name)
    if not last_name and not first_name:
        return None

    key = (last_name, first_name)
    if key in staff_cache:
        return staff_cache[key]

    new_id = create_staff(conn, last_name, first_name)
    staff_cache[key] = new_id
    return new_id


def get_existing_codes(conn):
    """Get set of existing CODE values in POINT table."""
    cursor = conn.cursor()
    cursor.execute("SELECT CODE FROM POINT WHERE CODE IS NOT NULL")
    return {row[0] for row in cursor.fetchall()}


def insert_point(conn, record):
    """Insert a single POINT record. Returns the new ID."""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO POINT
        (TITLE, CODE, POSITION_LAT, POSITION_LON, POSTALCODE,
         PREFECTURE, ADDRESS, DETAIL_URL, DESCRIPTION,
         CREATED_AT, SECTION_ID, CATEGORY_ID, STAFF_ID)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        record['TITLE'], record['CODE'],
        record['POSITION_LAT'], record['POSITION_LON'],
        record.get('POSTALCODE'), record.get('PREFECTURE'),
        record.get('ADDRESS'), record.get('DETAIL_URL'),
        record['DESCRIPTION'], record['CREATED_AT'],
        record['SECTION_ID'], record.get('CATEGORY_ID'),
        record['STAFF_ID']
    ))
    conn.commit()
