import re

import requests
from bs4 import BeautifulSoup


RANKING_URLS = {
    "up": "https://finance.yahoo.co.jp/stocks/ranking/up?market=all",
    "dividend": "https://finance.yahoo.co.jp/stocks/ranking/dividendYield?market=all",
}


def get_japan_ranking(kind="up", limit=10):
    url = RANKING_URLS.get(kind, RANKING_URLS["up"])
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    stocks = []
    rows = soup.select("li, tr")

    for row in rows:
        text = row.get_text(" ", strip=True)

        if "%" not in text:
            continue

        code_match = re.search(r"\b\d{4}\b", text)

        if not code_match:
            continue

        code = code_match.group()
        after_code = text[code_match.end():].strip()
        price_match = re.search(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?", after_code)
        percent_match = re.search(r"[+-]?\d+(?:\.\d+)?\s*%", after_code)
        before_code = text[:code_match.start()].strip()
        name = re.sub(r"^\d+\s*", "", before_code).strip()
        price = price_match.group() if price_match else ""
        percent = percent_match.group().replace(" ", "") if percent_match else ""

        stocks.append({
            "name": name,
            "code": code,
            "price": price,
            "change": percent if kind == "up" else "",
            "dividend_yield": percent if kind == "dividend" else "",
            "kind": kind,
            "raw": text,
        })

        if len(stocks) >= limit:
            break

    return stocks
