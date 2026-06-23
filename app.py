from flask import Flask

from routes.stocks import stocks_bp
from routes.weather import weather_bp


def create_app():
    app = Flask(__name__)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(weather_bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
