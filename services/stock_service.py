import time
from datetime import datetime
from pathlib import Path

import requests
import yfinance as yf
from yfinance import cache as yf_cache
from bs4 import BeautifulSoup

from profile import get_company_profile
from services.chart_service import get_price_charts
from utils.cache import TimedCache
from utils.formatters import safe_dict, safe_get, safe_number, safe_series


YFINANCE_CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "yfinance-cache"
YFINANCE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
yf_cache.set_cache_location(str(YFINANCE_CACHE_DIR))

stock_cache = TimedCache()
stock_card_cache = TimedCache()


def normalize_stock_code(code):
    return str(code or "").strip().upper()


def calculate_dividend_yield(dividend_rate, current_price):
    dividend_rate = safe_number(dividend_rate)
    current_price = safe_number(current_price)

    if dividend_rate is None or current_price is None or current_price == 0:
        return None

    return dividend_rate / current_price


def format_date_value(value):
    if value is None or value == "":
        return None

    try:
        timestamp = float(value)
        if timestamp <= 0:
            return None

        date = datetime.fromtimestamp(timestamp)
        return f"{date.year}年{date.month}月{date.day}日"
    except Exception:
        return str(value)


def get_japanese_stock_name(code):
    code = normalize_stock_code(code)

    try:
        url = f"https://finance.yahoo.co.jp/quote/{code}.T"
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=6)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        title = soup.select_one("h1")

        if title:
            name = title.get_text(" ", strip=True).replace(f"({code}.T)", "").strip()
            name = name.replace("の株価・株式情報", "").strip()
            if name:
                return name
    except Exception:
        return ""

    return ""


def get_stock_card(code):
    code = normalize_stock_code(code)
    now = time.time()
    cached = stock_card_cache.get(code, now)

    if cached:
        return cached

    symbol = f"{code}.T"
    ticker = yf.Ticker(symbol)
    info = ticker.info
    fast = ticker.fast_info
    last_price = safe_number(safe_get(fast, "lastPrice"))
    previous_close = safe_number(safe_get(fast, "previousClose"))
    price_change = None
    price_change_percent = None

    if last_price is not None and previous_close is not None:
        price_change = last_price - previous_close

        if previous_close:
            price_change_percent = price_change / previous_close * 100

    name = get_japanese_stock_name(code) or info.get("longName") or info.get("shortName") or code
    change = ""

    if price_change_percent is not None:
        change = f"{price_change_percent:+.2f}%"
    elif price_change is not None:
        change = f"{price_change:+,.0f}円"

    data = {
        "name": name,
        "code": code,
        "price": f"{last_price:,.0f}" if last_price is not None else "",
        "change": change or "前日比不明",
        "dividend_yield": "",
        "kind": "search",
    }

    stock_card_cache.set(code, now, data)
    return data


def get_stock_detail(code):
    code = normalize_stock_code(code)
    now = time.time()
    cached = stock_cache.get(code, now)

    if cached:
        return cached

    symbol = f"{code}.T"
    ticker = yf.Ticker(symbol)
    info = ticker.info
    fast = ticker.fast_info
    profile = get_company_profile(code)
    last_price = safe_number(safe_get(fast, "lastPrice"))
    previous_close = safe_number(safe_get(fast, "previousClose"))
    dividend_rate = safe_number(info.get("dividendRate"))
    dividend_yield = calculate_dividend_yield(dividend_rate, last_price)
    price_change = None
    price_change_percent = None

    if last_price is not None and previous_close is not None:
        price_change = last_price - previous_close

        if previous_close:
            price_change_percent = price_change / previous_close * 100

    data = {
        "code": code,
        "symbol": symbol,
        "summary": {
            "name": get_japanese_stock_name(code) or info.get("longName") or info.get("shortName") or code,
            "code": code,
            "symbol": symbol,
            "current_price": last_price,
            "previous_close": previous_close,
            "change": price_change,
            "change_percent": price_change_percent,
        },
        "basic": {
            "会社名": get_japanese_stock_name(code) or info.get("longName") or info.get("shortName"),
            "銘柄コード": code,
            "市場": profile.get("市場名") or info.get("exchange"),
            "業種": profile.get("業種分類") or info.get("industry"),
            "特色": profile.get("特色"),
            "本社所在地": profile.get("本社所在地"),
            "代表者": profile.get("代表者名"),
            "設立年月日": profile.get("設立年月日"),
            "上場年月日": profile.get("上場年月日"),
            "決算": profile.get("決算"),
            "単元株数": profile.get("単元株数"),
            "従業員数": profile.get("従業員数（連結）") or profile.get("従業員数（単独）"),
            "平均年齢": profile.get("平均年齢"),
            "平均年収": profile.get("平均年収"),
            "Webサイト": info.get("website"),
        },
        "profile_text": {
            "特色": profile.get("特色"),
            "関連事業": profile.get("連結事業"),
        },
        "price": {
            "現在値": safe_get(fast, "lastPrice"),
            "前日終値": safe_get(fast, "previousClose"),
            "始値": safe_get(fast, "open"),
            "高値": safe_get(fast, "dayHigh"),
            "安値": safe_get(fast, "dayLow"),
            "出来高": safe_get(fast, "lastVolume"),
            "時価総額": info.get("marketCap"),
            "52週高値": info.get("fiftyTwoWeekHigh"),
            "52週安値": info.get("fiftyTwoWeekLow"),
        },
        "valuation": {
            "PER": info.get("trailingPE"),
            "予想PER": info.get("forwardPE"),
            "PBR": info.get("priceToBook"),
            "EPS": info.get("trailingEps"),
            "予想EPS": info.get("forwardEps"),
            "ROE": info.get("returnOnEquity"),
            "ROA": info.get("returnOnAssets"),
        },
        "dividend": {
            "配当利回り": dividend_yield,
            "年間配当": dividend_rate,
            "配当性向": info.get("payoutRatio"),
            "権利落ち日": format_date_value(info.get("exDividendDate")),
        },
        "financials": {
            "売上高": info.get("totalRevenue"),
            "売上総利益": info.get("grossProfits"),
            "営業利益": info.get("operatingIncome"),
            "純利益": info.get("netIncomeToCommon"),
            "総資産": info.get("totalAssets"),
            "有利子負債": info.get("totalDebt"),
            "営業キャッシュフロー": info.get("operatingCashflow"),
            "フリーキャッシュフロー": info.get("freeCashflow"),
        },
        "charts": get_price_charts(ticker),
        "statements": {
            "\u8b33\u54b2\u5be2\u96aa\u80b2\uff6e\u73b2\u5d8c": safe_dict(ticker.financials),
            "\u96cb\uff78\u86df\u6eb7\uff6f\uff7e\u8fa3\uff67\u9666\uff68": safe_dict(ticker.balance_sheet),
            "\u9a5f\u698a\uff7d\u707d\uff71\uff65\u8c41\uff74": safe_series(ticker.dividends),
            "\u8b5c\uff6a\u8811\u4e1e\uff65\u8708\uff72\u87bb\uff65\u8c41\uff74": safe_series(ticker.splits),
        },
    }

    stock_cache.set(code, now, data)
    return data
