import re

import requests
from bs4 import BeautifulSoup


RANKING_URLS = {
    "up": "https://finance.yahoo.co.jp/stocks/ranking/up?market=all",
    "down": "https://finance.yahoo.co.jp/stocks/ranking/down?market=all",
    "dividend": "https://finance.yahoo.co.jp/stocks/ranking/dividendYield?market=all",
    "attention": "https://finance.yahoo.co.jp/stocks/ranking/hot?market=all",
    "marketcap": "https://finance.yahoo.co.jp/stocks/ranking/marketCapitalHigh?market=all",
}


def format_market_cap_from_million_yen(value):
    million_yen = float(value.replace(",", ""))
    oku_yen = million_yen / 100

    if oku_yen >= 10_000:
        return f"{oku_yen / 10_000:.1f}兆円"

    return f"{oku_yen:,.0f}億円"


def get_japan_ranking(kind="up", limit=10):
    url = RANKING_URLS.get(kind, RANKING_URLS["up"])
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    stocks = []
    seen_codes = set()
    rows = soup.select("li, tr")

    for row in rows:
        text = row.get_text(" ", strip=True)
        code_match = re.search(r"\b\d{3}[0-9A-Z]\b", text)

        if not code_match:
            continue

        code = code_match.group()
        if code in seen_codes:
            continue

        after_code = text[code_match.end():].strip()
        price_match = re.search(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?", after_code)
        percent_match = re.search(r"[+-]?\d+(?:\.\d+)?\s*%", after_code)
        market_cap_match = re.search(r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*百万円", after_code)
        before_code = text[:code_match.start()].strip()
        name = re.sub(r"^\d+\s*", "", before_code).strip()
        price = price_match.group() if price_match else ""
        percent = percent_match.group().replace(" ", "") if percent_match else ""
        market_cap = format_market_cap_from_million_yen(market_cap_match.group(1)) if market_cap_match else ""

        if kind in ("up", "down", "dividend", "attention") and "%" not in text:
            continue

        if kind == "marketcap" and not market_cap:
            continue

        seen_codes.add(code)
        stocks.append({
            "name": name,
            "code": code,
            "price": price,
            "change": percent if kind in ("up", "down", "attention") else "",
            "dividend_yield": percent if kind == "dividend" else "",
            "market_cap_text": market_cap,
            "kind": kind,
            "raw": text,
        })

        if len(stocks) >= limit:
            break

    return stocks
