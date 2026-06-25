import json


class FakeResponse:
    # Small fake `requests.get` response object used to avoid real network calls.
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests as _requests
            raise _requests.HTTPError(response=self)


def build_test_app():
    # Build a minimal Flask app that registers your blueprints so we can call endpoints.
    from flask import Flask
    from routes.spotify import spotify_bp
    from routes.lastfm import lastfm_bp

    app = Flask(__name__)
    app.register_blueprint(spotify_bp)
    app.register_blueprint(lastfm_bp)
    return app


def test_backend_routes_and_helpers(monkeypatch, tmp_path):
    """
    Test: cover the main backend endpoints and helper functions without hitting
    real Spotify/Last.fm.
    
    What this test verifies:
    - Helper functions in `routes/spotify.py` behave as expected.
    - `/spotify/liked-songs` can sync mocked liked songs into the DB.
    - `/spotify/tag-songs` can tag songs (genre/vibe) using mocked API calls.
    - `/spotify/sort/preview` returns grouped output for selected filters.
    - `/lastfm/tags` returns a mocked payload.
    """
    from database import db as dbmod
    from routes import spotify as spotify_mod
    from routes import lastfm as lastfm_mod

    # Temp DB
    monkeypatch.setattr(dbmod, "DB_FILE", str(tmp_path / "routes_test.db"), raising=True)
    dbmod.init_db()

    app = build_test_app()
    client = app.test_client()

    # Helper function coverage: _extract_token + _year_bucket + map_genres + map_vibes
    with app.test_request_context(headers={"Authorization": "Bearer abc"}):
        assert spotify_mod._extract_token() == "abc"
    with app.test_request_context(headers={}):
        assert spotify_mod._extract_token() is None

    assert spotify_mod._year_bucket(None) == "Unknown"
    assert spotify_mod._year_bucket(2024) == "2020s"
    assert "Hip-Hop" in spotify_mod.map_genres(["boom bap", "chicago drill"])

    vibes = spotify_mod.map_vibes({"energy": 0.2, "valence": 0.1, "danceability": 0.8, "tempo": 130})
    assert isinstance(vibes, list)

    # Mock all outbound HTTP in one place
    def fake_get(url, headers=None, params=None, timeout=None):
        # This function replaces `requests.get` inside the route modules.
        # We return predictable responses based on the URL being requested.
        # Spotify /me
        if url == "https://api.spotify.com/v1/me":
            return FakeResponse(200, {"id": "spotify_user_1", "display_name": "Tester", "email": "tester@example.com"})

        # Liked songs pagination
        if url == "https://api.spotify.com/v1/me/tracks":
            return FakeResponse(
                200,
                {
                    "items": [
                        {
                            "track": {
                                "id": "t1",
                                "name": "Song One",
                                "artists": [{"name": "Artist A"}],
                                "album": {"name": "Album A", "release_date": "2003-01-01"},
                                "duration_ms": 180000,
                            }
                        }
                    ],
                    "next": None,
                },
            )

        # Audio features
        if url == "https://api.spotify.com/v1/audio-features":
            ids = (params or {}).get("ids", "")
            features = [{"id": tid, "energy": 0.9, "valence": 0.8, "danceability": 0.8, "tempo": 128} for tid in ids.split(",") if tid]
            return FakeResponse(200, {"audio_features": features})

        # Tracks -> artist ids
        if url == "https://api.spotify.com/v1/tracks":
            return FakeResponse(200, {"tracks": [{"id": "t1", "artists": [{"id": "a1"}]}]})

        # Artists -> genres
        if url == "https://api.spotify.com/v1/artists":
            return FakeResponse(200, {"artists": [{"id": "a1", "genres": ["boom bap"]}]})

        # Last.fm tags
        if url == "http://ws.audioscrobbler.com/2.0/":
            return FakeResponse(200, {"toptags": {"tag": [{"name": "chill"}]}})

        return FakeResponse(404, {"error": "unhandled url", "url": url})

    monkeypatch.setattr(spotify_mod.requests, "get", fake_get, raising=True)
    monkeypatch.setattr(lastfm_mod.requests, "get", fake_get, raising=True)
    monkeypatch.setenv("LASTFM_API_KEY", "fake_key")

    # Endpoint: /spotify/liked-songs
    resp = client.get("/spotify/liked-songs", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200
    assert resp.get_json()["total"] == 1

    # Endpoint: /spotify/tag-songs
    resp2 = client.get("/spotify/tag-songs", headers={"Authorization": "Bearer token"})
    assert resp2.status_code == 200
    assert resp2.get_json()["status"] == "done"

    # Endpoint: /spotify/sort/preview
    body = {"selected_options": {"Year": ["2000s"], "Artist": ["Artist A"]}}
    resp3 = client.post(
        "/spotify/sort/preview",
        data=json.dumps(body),
        content_type="application/json",
        headers={"Authorization": "Bearer token"},
    )
    assert resp3.status_code == 200
    assert resp3.get_json()["status"] == "ok"

    # Endpoint: /lastfm/tags
    resp4 = client.get("/lastfm/tags?artist=Artist%20A&track=Song%20One")
    assert resp4.status_code == 200
    assert resp4.get_json()["toptags"]["tag"][0]["name"] == "chill"


def test_backend_app_index(monkeypatch, tmp_path):
    """
    Test: cover `backend/app.py` `index()` route (GET /).
    This makes sure the Flask app boots and returns the expected health payload.
    """
    import importlib
    from database import db as dbmod

    monkeypatch.setattr(dbmod, "DB_FILE", str(tmp_path / "app_index.db"), raising=True)
    dbmod.init_db()

    app_module = importlib.import_module("app")  # backend/app.py
    client = app_module.app.test_client()
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}

