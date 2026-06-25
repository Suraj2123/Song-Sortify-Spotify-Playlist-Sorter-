"""
Tests for input validation and error responses added in the backend quality pass:
- 401 on missing/malformed Authorization header
- 400 on missing query params for /lastfm/tags
- 500 when LASTFM_API_KEY is unset
- sort_preview returns ok with zero matched songs when filters are too narrow
- /spotify/artists returns 404 when user has not synced yet
"""
import json


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError(response=self)


def _me_ok():
    return FakeResponse(200, {"id": "u1", "display_name": "T", "email": "t@t.com"})


def build_app(monkeypatch, tmp_path):
    from database import db as dbmod
    from flask import Flask
    from routes.spotify import spotify_bp
    from routes.lastfm import lastfm_bp

    monkeypatch.setattr(dbmod, "DB_FILE", str(tmp_path / "err_test.db"), raising=True)
    dbmod.init_db()

    app = Flask(__name__)
    app.register_blueprint(spotify_bp)
    app.register_blueprint(lastfm_bp)
    return app, dbmod


# ---------------------------------------------------------------------------
# 401 — missing or malformed Authorization header
# ---------------------------------------------------------------------------

def test_liked_songs_401_no_header(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()
    resp = client.get("/spotify/liked-songs")
    assert resp.status_code == 401
    assert "error" in resp.get_json()


def test_tag_songs_401_no_header(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()
    resp = client.get("/spotify/tag-songs")
    assert resp.status_code == 401


def test_sort_preview_401_no_header(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()
    resp = client.post("/spotify/sort/preview", content_type="application/json")
    assert resp.status_code == 401


def test_artists_401_no_header(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()
    resp = client.get("/spotify/artists")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /lastfm/tags — input validation
# ---------------------------------------------------------------------------

def test_lastfm_tags_missing_params(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()

    # Both params missing
    resp = client.get("/lastfm/tags")
    assert resp.status_code == 400
    assert "artist" in resp.get_json()["error"]

    # Only artist provided
    resp = client.get("/lastfm/tags?artist=Drake")
    assert resp.status_code == 400

    # Only track provided
    resp = client.get("/lastfm/tags?track=God%27s+Plan")
    assert resp.status_code == 400


def test_lastfm_tags_missing_api_key(monkeypatch, tmp_path):
    app, _ = build_app(monkeypatch, tmp_path)
    monkeypatch.delenv("LASTFM_API_KEY", raising=False)
    client = app.test_client()
    resp = client.get("/lastfm/tags?artist=Drake&track=God%27s+Plan")
    assert resp.status_code == 500
    assert "API key" in resp.get_json()["error"]


# ---------------------------------------------------------------------------
# /spotify/sort/preview — zero-match scenario
# ---------------------------------------------------------------------------

def test_sort_preview_zero_matches(monkeypatch, tmp_path):
    from database import db as dbmod
    from routes import spotify as spotify_mod

    app, dbmod = build_app(monkeypatch, tmp_path)
    client = app.test_client()

    # Seed one song from the 2000s
    user_id = dbmod.create_user("u_zero", "Zero", "zero@test.com")
    dbmod.add_liked_song(user_id, "t_zero", "Zero Song", "Zero Artist", "Album Z", 2003, 180000)

    def fake_get(url, headers=None, params=None, timeout=None):
        if "api.spotify.com/v1/me" in url:
            return FakeResponse(200, {"id": "u_zero"})
        return FakeResponse(404, {})

    monkeypatch.setattr(spotify_mod.requests, "get", fake_get, raising=True)

    # Filter for 1980s — no songs match
    body = {"selected_options": {"Year": ["1980s"], "Artist": []}}
    resp = client.post(
        "/spotify/sort/preview",
        data=json.dumps(body),
        content_type="application/json",
        headers={"Authorization": "Bearer token"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert data["status"] == "ok"
    assert data["matched_songs"] == 0
    assert data["groups"] == {}


# ---------------------------------------------------------------------------
# /spotify/artists — user not synced yet
# ---------------------------------------------------------------------------

def test_artists_user_not_found(monkeypatch, tmp_path):
    from routes import spotify as spotify_mod

    app, _ = build_app(monkeypatch, tmp_path)
    client = app.test_client()

    def fake_get(url, headers=None, params=None, timeout=None):
        if "api.spotify.com/v1/me" in url:
            return FakeResponse(200, {"id": "never_synced"})
        return FakeResponse(404, {})

    monkeypatch.setattr(spotify_mod.requests, "get", fake_get, raising=True)

    resp = client.get("/spotify/artists", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 404
    assert "error" in resp.get_json()


def test_artists_returns_list(monkeypatch, tmp_path):
    from database import db as dbmod
    from routes import spotify as spotify_mod

    app, dbmod = build_app(monkeypatch, tmp_path)
    client = app.test_client()

    # Seed user with 6 songs from the same artist so they clear the min_count=5 threshold
    user_id = dbmod.create_user("u_art", "Art User", "art@test.com")
    for i in range(6):
        dbmod.add_liked_song(
            user_id, f"t_a{i}", f"Song {i}", "Popular Artist", "Album A", 2020, 180000,
            artist_id="a_pop", artist_image="https://example.com/img.png",
        )

    def fake_get(url, headers=None, params=None, timeout=None):
        if "api.spotify.com/v1/me" in url:
            return FakeResponse(200, {"id": "u_art"})
        return FakeResponse(404, {})

    monkeypatch.setattr(spotify_mod.requests, "get", fake_get, raising=True)

    resp = client.get("/spotify/artists", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["artists"]) == 1
    assert data["artists"][0]["name"] == "Popular Artist"
