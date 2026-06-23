import yfinance as yf

toyota = yf.Ticker("7203.T")

info = toyota.fast_info

price = info["lastPrice"]
previous_close = info["previousClose"]
day_high = info["dayHigh"]
day_low = info["dayLow"]

print("現在価格:", price)
print("前日終値:", previous_close)
print("今日の高値:", day_high)
print("今日の安値:", day_low)