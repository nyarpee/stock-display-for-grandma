import sqlite3
import time
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent.parent / "data" / "stock_display.sqlite3"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_favorites_db():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS favorites (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price TEXT DEFAULT '',
                change TEXT DEFAULT '',
                dividend_yield TEXT DEFAULT '',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )


def normalize_favorite(stock):
    code = str(stock.get("code") or "").strip()
    name = str(stock.get("name") or code).strip()

    return {
        "code": code,
        "name": name,
        "price": str(stock.get("price") or "").strip(),
        "change": str(stock.get("change") or "").strip(),
        "dividend_yield": str(stock.get("dividend_yield") or stock.get("dividendYield") or "").strip(),
    }


def list_favorites():
    init_favorites_db()

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT code, name, price, change, dividend_yield
            FROM favorites
            ORDER BY created_at ASC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def save_favorite(stock):
    favorite = normalize_favorite(stock)

    if not favorite["code"]:
        raise ValueError("code is required")

    now = time.time()
    init_favorites_db()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO favorites (code, name, price, change, dividend_yield, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
                name = excluded.name,
                price = excluded.price,
                change = excluded.change,
                dividend_yield = excluded.dividend_yield,
                updated_at = excluded.updated_at
            """,
            (
                favorite["code"],
                favorite["name"],
                favorite["price"],
                favorite["change"],
                favorite["dividend_yield"],
                now,
                now,
            ),
        )

    return favorite


def delete_favorite(code):
    init_favorites_db()

    with get_connection() as connection:
        connection.execute("DELETE FROM favorites WHERE code = ?", (str(code).strip(),))
