import json
import time


def _init_temp_db(monkeypatch, tmp_path):
    # Helper: create a fresh temporary SQLite database for each test.
    # This keeps tests isolated and prevents touching your real `song_sortify.db`.
    from database import db as dbmod

    # Point DB_FILE at a temp location so we don't touch the real DB.
    monkeypatch.setattr(dbmod, "DB_FILE", str(tmp_path / "test_song_sortify.db"), raising=True)
    dbmod.init_db()
    return dbmod


def _create_user(dbmod):
    # Helper: create a single user record used by multiple tests.
    return dbmod.create_user("spotify_abc", "Test User", "test@example.com")


def test_db_init_and_connection(monkeypatch, tmp_path):
    # Test: database initializes and we can run a trivial SQL query.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    with dbmod.get_connection() as conn:
        assert conn.execute("SELECT 1").fetchone()[0] == 1


def test_users(monkeypatch, tmp_path):
    # Test: user CRUD basics (create, lookup by id, lookup by spotify_id).
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    assert dbmod.get_user_by_id(user_id)[0] == user_id
    assert dbmod.get_user_by_spotify_id("spotify_abc")[0] == user_id


def test_tokens(monkeypatch, tmp_path):
    # Test: token save and retrieve for a user.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    dbmod.save_tokens(user_id, "access123", "refresh123", "2099-01-01T00:00:00Z")
    tokens = dbmod.get_tokens(user_id)
    assert tokens is not None
    assert tokens[1] == user_id


def test_liked_songs_add_get_delete(monkeypatch, tmp_path):
    # Test: liked songs insert, read, then delete-all for a user.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    dbmod.add_liked_song(user_id, "track_1", "Song 1", "Artist 1", "Album 1", 2003, 180000)
    dbmod.add_liked_song(user_id, "track_2", "Song 2", "Artist 2", "Album 2", 2024, 200000)
    assert len(dbmod.get_liked_songs(user_id)) == 2
    dbmod.delete_user_liked_songs(user_id)
    assert dbmod.get_liked_songs(user_id) == []


def test_genres_and_song_genres(monkeypatch, tmp_path):
    # Test: genre de-duplication and linking a song row to a genre row.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    dbmod.add_liked_song(user_id, "track_3", "Song 3", "Artist 3", "Album 3", 1999, 210000)
    song_row_id = dbmod.get_liked_songs(user_id)[0][0]  # liked_songs.id

    g1 = dbmod.get_or_create_genre("Hip-Hop", "genre")
    g2 = dbmod.get_or_create_genre("Hip-Hop", "genre")
    assert g1 == g2
    dbmod.add_song_genre(song_row_id, g1)


def test_get_user_artists(monkeypatch, tmp_path):
    # Test: aggregate artists from liked songs (used for the Artist tab UI).
    # We include an artist_image URL so the UI can show an image when available.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    dbmod.add_liked_song(
        user_id,
        "track_4",
        "Song 4",
        "Artist 4",
        "Album 4",
        2024,
        180000,
        artist_id="artist_spotify_4",
        artist_image="https://example.com/image.png",
    )
    artists = dbmod.get_user_artists(user_id, min_count=1)
    assert isinstance(artists, list)
    assert artists[0]["name"] == "Artist 4"


def test_playlists(monkeypatch, tmp_path):
    # Test: playlist row creation and linking songs to a playlist in the DB.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    dbmod.add_liked_song(user_id, "track_5", "Song 5", "Artist 5", "Album 5", 2008, 200000)
    song_row_id = dbmod.get_liked_songs(user_id)[0][0]

    playlist_id = dbmod.create_playlist(user_id, "spotify_pl_1", "My Mix", "Genre")
    dbmod.add_playlist_song(playlist_id, song_row_id)
    assert len(dbmod.get_playlists(user_id)) == 1
    assert len(dbmod.get_playlist_songs(playlist_id)) == 1


def test_runs(monkeypatch, tmp_path):
    # Test: run history insert + latest-run retrieval.
    dbmod = _init_temp_db(monkeypatch, tmp_path)
    user_id = _create_user(dbmod)
    run_id_1 = dbmod.create_run(user_id, json.dumps({"Year": ["2000s"]}), 1, 1)
    assert dbmod.get_latest_run(user_id)[0] == run_id_1

    # SQLite created_at is second-resolution; ensure ordering differs.
    time.sleep(1.05)
    run_id_2 = dbmod.create_run(user_id, json.dumps({"Artist": ["Artist 3"]}), 1, 1)
    assert dbmod.get_latest_run(user_id)[0] == run_id_2

