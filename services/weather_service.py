import time

import requests

from utils.cache import TimedCache


DEFAULT_WEATHER_AREA = "471010"
DEFAULT_WEATHER_LAT = 26.1911
DEFAULT_WEATHER_LON = 127.7286

weather_cache = TimedCache()


def format_weather_date(value):
    if not value:
        return ""

    try:
        return value[:10]
    except Exception:
        return str(value)


def to_float(value, default):
    try:
        return float(value)
    except Exception:
        return default


def livedoor_theme(text):
    text = str(text or "")

    if "\u96ea" in text:
        return "snow"

    if "\u96e8" in text:
        return "rain"

    if "\u6674" in text:
        return "sunny"

    return "cloudy"


def normalize_percent(value):
    if value is None:
        return ""

    return str(value).replace("%", "")


def max_livedoor_pop(chance):
    values = []

    for value in chance.values():
        text = normalize_percent(value)

        try:
            values.append(int(text))
        except Exception:
            pass

    if not values:
        return ""

    return str(max(values))


def build_livedoor_day(forecast):
    temperature = forecast.get("temperature") or {}
    temp_min = (temperature.get("min") or {}).get("celsius") or ""
    temp_max = (temperature.get("max") or {}).get("celsius") or ""
    image = forecast.get("image") or {}

    return {
        "date": format_weather_date(forecast.get("date")),
        "date_label": forecast.get("dateLabel") or "",
        "weather": forecast.get("telop") or "",
        "weather_code": "",
        "icon": image.get("url") or "",
        "label": forecast.get("telop") or image.get("title") or "",
        "pop": normalize_percent(max_livedoor_pop(forecast.get("chanceOfRain") or {})),
        "reliability": "",
        "temp_min": temp_min,
        "temp_max": temp_max,
    }


def build_livedoor_time_blocks(forecast):
    chance = forecast.get("chanceOfRain") or {}
    labels = [
        ("00-06", "T00_06"),
        ("06-12", "T06_12"),
        ("12-18", "T12_18"),
        ("18-24", "T18_24"),
    ]

    return [
        {
            "time": label,
            "temp": "",
            "pop": normalize_percent(chance.get(key)),
            "weather_code": "",
            "icon": "",
            "label": "\u964d\u6c34\u78ba\u7387",
            "wind": "",
        }
        for label, key in labels
    ]


def get_weather_forecast(area_code=DEFAULT_WEATHER_AREA, lat=DEFAULT_WEATHER_LAT, lon=DEFAULT_WEATHER_LON):
    now = time.time()
    lat = to_float(lat, DEFAULT_WEATHER_LAT)
    lon = to_float(lon, DEFAULT_WEATHER_LON)
    cache_key = f"{area_code}:{lat:.3f}:{lon:.3f}"
    cached = weather_cache.get(cache_key, now)

    if cached:
        return cached

    url = f"https://weather.tsukumijima.net/api/forecast/city/{area_code}"

    try:
        response = requests.get(
            url,
            headers={"User-Agent": "StockDisplayWeatherDevice/1.0"},
            timeout=10,
        )
        response.raise_for_status()
        raw = response.json()
        forecasts = raw.get("forecasts", [])
        today_forecast = forecasts[0] if forecasts else {}
        today_telop = today_forecast.get("telop") or ""
        today = [build_livedoor_day(today_forecast)] if today_forecast else []

        data = {
            "source": "\u5929\u6c17\u4e88\u5831API\uff08livedoor\u5929\u6c17\u4e92\u63db\uff09",
            "area_code": area_code,
            "area_name": raw.get("title") or raw.get("location", {}).get("city") or "",
            "temp_area_name": "",
            "publishing_office": raw.get("publishingOffice") or "",
            "report_datetime": raw.get("publicTimeFormatted") or raw.get("publicTime") or "",
            "theme": livedoor_theme(today_telop),
            "today": today,
            "hourly": build_livedoor_time_blocks(today_forecast),
            "week": [build_livedoor_day(forecast) for forecast in forecasts],
            "description": raw.get("description", {}).get("bodyText") or raw.get("description", {}).get("text") or "",
        }
    except Exception as error:
        data = {
            "source": "\u5929\u6c17\u4e88\u5831API\uff08livedoor\u5929\u6c17\u4e92\u63db\uff09",
            "area_code": area_code,
            "area_name": "",
            "temp_area_name": "",
            "publishing_office": "",
            "report_datetime": "",
            "theme": "cloudy",
            "today": [],
            "hourly": [],
            "week": [],
            "error": str(error),
        }

    weather_cache.set(cache_key, now, data)
    return data


def resolve_weather_area_from_location(lat, lon):
    try:
        lat = float(lat)
        lon = float(lon)
    except Exception:
        return DEFAULT_WEATHER_AREA

    known_areas = [
        {"code": "471010", "lat": 26.19, "lon": 127.73},
        {"code": "130010", "lat": 35.68, "lon": 139.76},
        {"code": "140010", "lat": 35.44, "lon": 139.64},
        {"code": "230010", "lat": 35.18, "lon": 136.91},
        {"code": "270000", "lat": 34.69, "lon": 135.50},
        {"code": "400010", "lat": 33.59, "lon": 130.40},
    ]

    nearest = min(
        known_areas,
        key=lambda area: (lat - area["lat"]) ** 2 + (lon - area["lon"]) ** 2,
    )

    return nearest["code"]
