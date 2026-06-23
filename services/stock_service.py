import time

import yfinance as yf

from profile import get_company_profile
from services.chart_service import get_price_charts
from utils.cache import TimedCache
from utils.formatters import safe_dict, safe_get, safe_number, safe_series


stock_cache = TimedCache()


def get_stock_detail(code):
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
            "name": info.get("longName") or info.get("shortName") or code,
            "code": code,
            "symbol": symbol,
            "current_price": last_price,
            "previous_close": previous_close,
            "change": price_change,
            "change_percent": price_change_percent,
        },
        "basic": {
            "\u83a8\u592c\uff64\uff7e\u8711\uff65": info.get("longName") or info.get("shortName"),
            "\u9a6b\u4ff6\u6c1b\u7e67\uff73\u7e5d\uff7c\u7e5d\uff65": code,
            "\u87f6\u3087\uf8f0\uff74": profile.get("\u87f6\u3087\uf8f0\uff74\u8711\uff65") or info.get("exchange"),
            "\u8b8c\uff6d\u905e\uff6e": profile.get("\u8b8c\uff6d\u905e\uff6e\u86fb\uff65\uff61\uff65") or info.get("industry"),
            "\u8b5b\uff6c\u9068\uff7e\u8b07\u0080\u8768\uff68\u8768\uff70": profile.get("\u8b5b\uff6c\u9068\uff7e\u8b07\u0080\u8768\uff68\u8768\uff70"),
            "\u8389\uff63\u9666\uff68\u95a0\uff65\u9310": profile.get("\u8389\uff63\u9666\uff68\u95a0\uff65\u9310"),
            "\u96aa\uff6d\u9076\u53e5\uff74\uff8e\u8b5b\u57df\u5f8b": profile.get("\u96aa\uff6d\u9076\u53e5\uff74\uff8e\u8b5b\u57df\u5f8b"),
            "\u8373\u96c1\uf8f0\uff74\u87f7\uff74\u8b5b\u57df\u5f8b": profile.get("\u8373\u96c1\uf8f0\uff74\u87f7\uff74\u8b5b\u57df\u5f8b"),
            "\u8c4e\uff7a\u9082\uff65": profile.get("\u8c4e\uff7a\u9082\uff65"),
            "\u870a\u4f05\uff65\u8b5c\uff6a\u8b28\uff70": profile.get("\u870a\u4f05\uff65\u8b5c\uff6a\u8b28\uff70"),
            "\u8815\u637a\uff65\uff6d\u8709\uff61\u8b28\uff70\uff65\u4ea5\u8170\u8fe2\uff6c\uff65\uff65": profile.get("\u8815\u637a\uff65\uff6d\u8709\uff61\u8b28\uff70\uff65\u4ea5\u8170\u8fe2\uff6c\uff65\uff65"),
            "\u8815\u637a\uff65\uff6d\u8709\uff61\u8b28\uff70\uff65\u78ef\u0080\uff63\u90a8\u64b0\uff7c\uff65": profile.get("\u8815\u637a\uff65\uff6d\u8709\uff61\u8b28\uff70\uff65\u78ef\u0080\uff63\u90a8\u64b0\uff7c\uff65"),
            "\u87f7\uff73\u876e\uff65\uff79\uff74\u9bae\uff62": profile.get("\u87f7\uff73\u876e\uff65\uff79\uff74\u9bae\uff62"),
            "\u87f7\uff73\u876e\uff65\uff79\uff74\u8700\uff65": profile.get("\u87f7\uff73\u876e\uff65\uff79\uff74\u8700\uff65"),
            "\u95cd\uff71\u8b41\uff65\uff64\uff7e\u8711\uff65": profile.get("\u95cd\uff71\u8b41\uff65\uff64\uff7e\u8711\uff65"),
            "Web\u7e67\uff75\u7e67\uff64\u7e5d\uff65": info.get("website"),
        },
        "profile_text": {
            "\u8ffa\uff79\u6ff6\uff72": profile.get("\u8ffa\uff79\u6ff6\uff72"),
            "\u9a3e\uff63\u90a8\u8749\uff7a\u533a\uff65\uff6d": profile.get("\u9a3e\uff63\u90a8\u8749\uff7a\u533a\uff65\uff6d"),
        },
        "price": {
            "\u8fc4\uff7e\u8768\uff68\u86df\uff64": safe_get(fast, "lastPrice"),
            "\u8708\u80b4\u5f8b\u90a8\u3087\u0080\uff64": safe_get(fast, "previousClose"),
            "\u87cb\u53e5\u0080\uff64": safe_get(fast, "open"),
            "\u9b2e\u4f05\u0080\uff64": safe_get(fast, "dayHigh"),
            "\u87b3\u7259\u0080\uff64": safe_get(fast, "dayLow"),
            "\u8703\uff7a\u8b5a\uff65\u9b2e\uff65": safe_get(fast, "lastVolume"),
            "\u8b56\u3086\uff7e\uff61\u90b1\u57ce\uff61\uff65": info.get("marketCap"),
            "52\u9a3e\uff71\u9b2e\u4f05\u0080\uff64": info.get("fiftyTwoWeekHigh"),
            "52\u9a3e\uff71\u87b3\u7259\u0080\uff64": info.get("fiftyTwoWeekLow"),
        },
        "valuation": {
            "PER": info.get("trailingPE"),
            "\u8385\u57df\u03a6PER": info.get("forwardPE"),
            "PBR": info.get("priceToBook"),
            "EPS": info.get("trailingEps"),
            "\u8385\u57df\u03a6EPS": info.get("forwardEps"),
            "ROE": info.get("returnOnEquity"),
            "ROA": info.get("returnOnAssets"),
        },
        "dividend": {
            "\u9a5f\u698a\uff7d\u707d\u831c\u8757\u69ed\uff6a": info.get("dividendYield"),
            "\u87f7\uff74\u9aea\u99b4\uff65\u8816\uff65": info.get("dividendRate"),
            "\u9a5f\u698a\uff7d\u637a\u0080\uff67\u8711\uff65": info.get("payoutRatio"),
            "\u9036\uff74\u9711\u9df9\uff65\u8816\u637a\u5f8b": str(info.get("exDividendDate")),
        },
        "financials": {
            "\u87a2\uff72\u8373\u4f01\uff6b\uff65": info.get("totalRevenue"),
            "\u87a2\uff72\u8373\u9854\uff77\u4e1e\u831c\u9036\uff65": info.get("grossProfits"),
            "\u875f\uff76\u8b8c\uff6d\u86fb\uff69\u9036\uff65": info.get("operatingIncome"),
            "\u908f\u6ccc\u831c\u9036\uff65": info.get("netIncomeToCommon"),
            "\u90b1\u5270\uff73\uff65\u809d": info.get("totalAssets"),
            "\u90b1\u5270\uff72\uf8f0\u86ef\uff75": info.get("totalDebt"),
            "\u875f\uff76\u8b8c\uff6dCF": info.get("operatingCashflow"),
            "\u7e5d\u8f14\u039c\u7e5d\uff7cCF": info.get("freeCashflow"),
        },
        "charts": get_price_charts(ticker),
        "statements": {
            "\u8b33\u54b2\u5be2\u96aa\u80b2\uff6e\u73b2\u5d8c": safe_dict(ticker.financials),
            "\u96cb\uff78\u86df\u6eb7\uff6f\uff7e\u8fa3\uff67\u9666\uff68": safe_dict(ticker.balance_sheet),
            "\u7e67\uff6d\u7e5d\uff63\u7e5d\uff65\u3059\u7e5d\uff65\u7e5d\u8f14\u039f\u7e5d\uff7c": safe_dict(ticker.cashflow),
            "\u9a5f\u698a\uff7d\u707d\uff71\uff65\u8c41\uff74": safe_series(ticker.dividends),
            "\u8b5c\uff6a\u8811\u4e1e\uff65\u8708\uff72\u87bb\uff65\u8c41\uff74": safe_series(ticker.splits),
        },
    }

    stock_cache.set(code, now, data)
    return data
