from flask import Flask

from routes.stocks import stocks_bp
from routes.weather import weather_bp
from services.favorite_service import init_favorites_db


def create_app():
    app = Flask(__name__)
    init_favorites_db()
    app.register_blueprint(stocks_bp)
    app.register_blueprint(weather_bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
