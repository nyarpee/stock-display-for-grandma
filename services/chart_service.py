def get_price_charts(ticker):
    ranges = {
        "1d": {"label": "1\u65e5", "period": "1d", "interval": "5m"},
        "1w": {"label": "1\u9031", "period": "5d", "interval": "30m"},
        "1m": {"label": "1\u304b\u6708", "period": "1mo", "interval": "1d"},
        "6m": {"label": "6\u304b\u6708", "period": "6mo", "interval": "1d"},
        "1y": {"label": "1\u5e74", "period": "1y", "interval": "1wk"},
    }

    charts = {}

    for key, config in ranges.items():
        try:
            history = ticker.history(
                period=config["period"],
                interval=config["interval"],
                auto_adjust=False,
            )
            points = []

            if history is not None and not history.empty:
                history = history.dropna(subset=["Close"])

                for date, row in history.iterrows():
                    close = row.get("Close")

                    if close is None:
                        continue

                    points.append({
                        "date": str(date),
                        "close": float(close),
                    })

            charts[key] = {
                "label": config["label"],
                "points": points,
            }
        except Exception:
            charts[key] = {
                "label": config["label"],
                "points": [],
            }

    return charts
