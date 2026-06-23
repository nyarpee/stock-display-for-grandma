from flask import Blueprint, jsonify, render_template, request

from services.ranking_service import get_japan_ranking
from services.stock_service import get_stock_detail


stocks_bp = Blueprint("stocks", __name__)


@stocks_bp.route("/")
def index():
    kind = request.args.get("ranking", "up")
    stocks = get_japan_ranking(kind=kind, limit=10)

    return render_template("stocks.html", stocks=stocks, ranking=kind)


@stocks_bp.route("/api/ranking")
def ranking_api():
    kind = request.args.get("ranking", "up")
    page = int(request.args.get("page", "1"))
    limit = page * 10
    stocks = get_japan_ranking(kind=kind, limit=limit)
    start = (page - 1) * 10
    end = page * 10

    return jsonify(stocks[start:end])


@stocks_bp.route("/api/stock/<code>")
def stock_detail_api(code):
    return jsonify(get_stock_detail(code))
