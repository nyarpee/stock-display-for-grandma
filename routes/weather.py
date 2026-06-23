from flask import Blueprint, jsonify, render_template, request

from services.weather_service import (
    DEFAULT_WEATHER_AREA,
    DEFAULT_WEATHER_LAT,
    DEFAULT_WEATHER_LON,
    get_weather_forecast,
    resolve_weather_area_from_location,
)


weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather")
def weather_page():
    area = request.args.get("area", DEFAULT_WEATHER_AREA)
    lat = request.args.get("lat", DEFAULT_WEATHER_LAT)
    lon = request.args.get("lon", DEFAULT_WEATHER_LON)
    weather = get_weather_forecast(area, lat, lon)

    return render_template("weather.html", weather=weather)


@weather_bp.route("/api/weather")
def weather_api():
    area = request.args.get("area", DEFAULT_WEATHER_AREA)
    lat = request.args.get("lat", DEFAULT_WEATHER_LAT)
    lon = request.args.get("lon", DEFAULT_WEATHER_LON)

    return jsonify(get_weather_forecast(area, lat, lon))


@weather_bp.route("/api/weather/area")
def weather_area_api():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    area = resolve_weather_area_from_location(lat, lon)

    return jsonify({"area": area, "lat": lat, "lon": lon})
