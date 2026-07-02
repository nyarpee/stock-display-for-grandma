import time

import yfinance as yf

from services.chart_service import get_price_charts
from utils.cache import TimedCache
from utils.formatters import safe_get, safe_number


market_cache = TimedCache(ttl=60 * 30)

MARKET_INDEXES = [
    {"key": "nikkei", "name": "日経平均", "symbol": "^N225"},
    {"key": "topix_etf", "name": "TOPIX連動ETF", "symbol": "1306.T"},
]


def format_index_price(value):
    value = safe_number(value)
    return f"{value:,.2f}" if value is not None else ""


def format_index_change(current, previous):
    current = safe_number(current)
    previous = safe_number(previous)

    if current is None or previous is None:
        return {
            "change": "",
            "change_percent": "",
            "direction": "up",
        }

    diff = current - previous
    percent = diff / previous * 100 if previous else 0

    return {
        "change": f"{diff:+,.2f}",
        "change_percent": f"{percent:+.2f}%",
        "direction": "up" if diff >= 0 else "down",
    }


def get_index_fallback_prices(ticker):
    try:
        history = ticker.history(period="5d", interval="1d", auto_adjust=False).dropna(subset=["Close"])

        if history is None or history.empty:
            return None, None

        closes = [safe_number(value) for value in history["Close"].tolist()]
        closes = [value for value in closes if value is not None]

        if not closes:
            return None, None

        current = closes[-1]
        previous = closes[-2] if len(closes) >= 2 else None
        return current, previous
    except Exception:
        return None, None


def get_market_index(config, with_charts=False):
    ticker = yf.Ticker(config["symbol"])

    try:
        fast = ticker.fast_info
        current = safe_number(safe_get(fast, "lastPrice"))
        previous = safe_number(safe_get(fast, "previousClose"))
    except Exception:
        current = None
        previous = None

    if current is None or previous is None:
        fallback_current, fallback_previous = get_index_fallback_prices(ticker)
        current = current if current is not None else fallback_current
        previous = previous if previous is not None else fallback_previous

    change = format_index_change(current, previous)

    return {
        "key": config["key"],
        "name": config["name"],
        "symbol": config["symbol"],
        "price": format_index_price(current),
        "previous_close": format_index_price(previous),
        "change": change["change"],
        "change_percent": change["change_percent"],
        "direction": change["direction"],
        "charts": get_price_charts(ticker) if with_charts else {},
    }


def get_japan_market_overview():
    now = time.time()
    cached = market_cache.get("japan", now)

    if cached:
        return cached

    indexes = []

    for index, config in enumerate(MARKET_INDEXES):
        try:
            indexes.append(get_market_index(config, with_charts=index == 0))
        except Exception:
            indexes.append({
                "key": config["key"],
                "name": config["name"],
                "symbol": config["symbol"],
                "price": "",
                "previous_close": "",
                "change": "",
                "change_percent": "",
                "direction": "up",
                "charts": {},
            })

    data = {
        "main": indexes[0] if indexes else {},
        "indexes": indexes,
        "updated_at": int(now),
    }

    market_cache.set("japan", now, data)
    return data
