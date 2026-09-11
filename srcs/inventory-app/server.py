import logging

from flask import Flask, jsonify

from app.config.database import (
    create_database_engine,
    create_schema,
    create_session_factory,
)
from app.config.settings import load_settings
from app.models import Movie


LOGGER = logging.getLogger(__name__)

app = Flask(__name__)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    settings = load_settings()
    engine = create_database_engine(settings)
    create_schema(engine)
    session_factory = create_session_factory(engine)

    @app.get("/api/movies")
    def list_movies():
        with session_factory() as session:
            movies = session.query(Movie).order_by(Movie.title.asc()).all()
            return jsonify([movie.to_dict() for movie in movies]), 200

    LOGGER.info("Inventory API is listening on port %s", settings.inventory_port)
    app.run(host="0.0.0.0", port=settings.inventory_port)


if __name__ == "__main__":
    main()
