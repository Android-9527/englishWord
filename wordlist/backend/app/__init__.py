from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db
from .routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r'/api/*': {'origins': '*'}})
    db.init_app(app)

    app.register_blueprint(api_bp, url_prefix='/api')

    @app.get('/')
    def index():
        return jsonify({'message': 'Wordlist backend running'})

    with app.app_context():
        db.create_all()

    return app
