from flask import Blueprint, jsonify, render_template, request

from services.favorite_service import delete_favorite, list_favorites, record_favorite_open, save_favorite
from services.market_service import get_japan_market_overview
from services.ranking_service import get_japan_ranking
from services.stock_service import get_stock_card, get_stock_detail


stocks_bp = Blueprint("stocks", __name__)


@stocks_bp.route("/")
def index():
    kind = request.args.get("ranking", "up")
    stocks = [] if kind in ("favorites", "search", "japan") else get_japan_ranking(kind=kind, limit=10)
    market_overview = get_japan_market_overview() if kind == "japan" else None

    return render_template("stocks.html", stocks=stocks, ranking=kind, market_overview=market_overview)


@stocks_bp.route("/api/ranking")
def ranking_api():
    kind = request.args.get("ranking", "up")
    if kind in ("favorites", "search", "japan"):
        return jsonify([])

    page = int(request.args.get("page", "1"))
    limit = page * 10
    stocks = get_japan_ranking(kind=kind, limit=limit)
    start = (page - 1) * 10
    end = page * 10

    return jsonify(stocks[start:end])


@stocks_bp.route("/api/stock/<code>")
def stock_detail_api(code):
    return jsonify(get_stock_detail(code))


@stocks_bp.route("/api/stock-card/<code>")
def stock_card_api(code):
    return jsonify(get_stock_card(code))


@stocks_bp.route("/api/favorites")
def favorites_api():
    return jsonify(list_favorites())


@stocks_bp.route("/api/japan-market")
def japan_market_api():
    return jsonify(get_japan_market_overview())


@stocks_bp.route("/api/favorites", methods=["POST"])
def add_favorite_api():
    try:
        favorite = save_favorite(request.get_json(silent=True) or {})
        return jsonify(favorite)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@stocks_bp.route("/api/favorites/<code>", methods=["DELETE"])
def delete_favorite_api(code):
    delete_favorite(code)
    return jsonify({"ok": True})


@stocks_bp.route("/api/favorites/<code>/open", methods=["POST"])
def record_favorite_open_api(code):
    return jsonify({"ok": record_favorite_open(code)})
