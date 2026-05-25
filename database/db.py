import sqlite3
import os

# DB in project root so it works whether we run from backend/ or project root
DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # goes to proj root
DB_FILE = os.path.join(DB_DIR, 'song_sortify.db')
SCHEMA = os.path.join(os.path.dirname(__file__), 'schema.sql')


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    # SQLite does not enforce foreign keys unless enabled per connection.
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    """Run this once to create tables."""
    with get_connection() as conn:
        with open(SCHEMA, 'r', encoding='utf-8') as schema_file:
            conn.executescript(schema_file.read())

        # migration to make sure if new columsn are added to tables, they do get updated. 
        cols = {row[1] for row in conn.execute('PRAGMA table_info(liked_songs)').fetchall()}
        if 'artist_id' not in cols:
            conn.execute('ALTER TABLE liked_songs ADD COLUMN artist_id TEXT')
        if 'artist_image' not in cols:
            conn.execute('ALTER TABLE liked_songs ADD COLUMN artist_image TEXT')


# Users

def create_user(spotify_id, display_name, email):
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO users (spotify_id, display_name, email) VALUES (?, ?, ?)',
            (spotify_id, display_name, email)
        )
        user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    return user_id


def get_user_by_id(user_id):
    with get_connection() as conn:
        row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    return row  # returns tuple like (1, 'spotify_123', 'Suraj', 's@email.com', '2025-02-21')


def get_user_by_spotify_id(spotify_id):
    with get_connection() as conn:
        row = conn.execute('SELECT * FROM users WHERE spotify_id = ?', (spotify_id,)).fetchone()
    return row


# Spotify Tokens

def save_tokens(user_id, access_token, refresh_token, expires_at):
    with get_connection() as conn:
        conn.execute('DELETE FROM spotify_tokens WHERE user_id = ?', (user_id,))
        conn.execute(
            'INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
            (user_id, access_token, refresh_token, expires_at)
        )


def get_tokens(user_id):
    with get_connection() as conn:
        row = conn.execute(
            'SELECT * FROM spotify_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            (user_id,)
        ).fetchone()
    return row


# Liked Songs


def add_liked_song(
    user_id,
    spotify_track_id,
    title,
    artist,
    album=None,
    year=None,
    duration_ms=None,
    artist_id=None,
    artist_image=None,
):
    with get_connection() as conn:
        conn.execute(
            '''
            INSERT INTO liked_songs
            (user_id, spotify_track_id, title, artist, artist_id, artist_image, album, year, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (user_id, spotify_track_id, title, artist, artist_id, artist_image, album, year, duration_ms)
        )


def get_liked_songs(user_id):
    with get_connection() as conn:
        rows = conn.execute('SELECT * FROM liked_songs WHERE user_id = ?', (user_id,)).fetchall()
    return rows


def delete_user_liked_songs(user_id):
    """Clear liked songs for a user (used before re-sync from Spotify)."""
    with get_connection() as conn:
        conn.execute('DELETE FROM liked_songs WHERE user_id = ?', (user_id,))

# THIS IS FOR THE GENRE SORTING

def get_or_create_genre(name, type): # name is category name, type is the type of category, like vibe or genre
    with get_connection() as conn:
        row = conn.execute(
            # chekcs if there is a genre with the name and type already, '?' is a placeholder
            'SELECT * FROM genres WHERE name = ? AND type = ?', (name, type)
        ).fetchone()
        if row is None: # if it doesnt exist yet, it inserts the name and type and creates a genre id
            conn.execute(
                'INSERT INTO genres (name, type) VALUES (?, ?)', (name, type)
            )
            # grabs the id of the row
            genre_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        else:
            genre_id = row[0]
    # returns a tuple (id, name, type)
    return genre_id

def add_song_genre(song_id, genre_id): # song_id is the id of the song from liked_songs, genre_id is the id from creating genre
    with get_connection() as conn:
        conn.execute(
            # inserts into song_genres. if the combo exists, it skips
            'INSERT OR IGNORE INTO song_genres (song_id, genre_id) VALUES (?, ?)',
            (song_id, genre_id)
        )


def get_user_artists(user_id, min_count=5):
    with get_connection() as conn:
        rows = conn.execute(
            '''
            SELECT artist, MAX(artist_image) as artist_image, COUNT(*) as count
            FROM liked_songs
            WHERE user_id = ?
            GROUP BY artist
            HAVING count >= ?
            ORDER BY count DESC
            ''',
            (user_id, min_count)
        ).fetchall()
    return [{'name': row[0], 'image': row[1]} for row in rows]


# Playlists

def create_playlist(user_id, spotify_playlist_id, name, category):
    with get_connection() as conn:
        conn.execute(
            '''
            INSERT INTO playlists (user_id, spotify_playlist_id, name, category)
            VALUES (?, ?, ?, ?)
            ''',
            (user_id, spotify_playlist_id, name, category)
        )
        playlist_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    return playlist_id


def add_playlist_song(playlist_id, song_id):
    with get_connection() as conn:
        conn.execute(
            'INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
            (playlist_id, song_id)
        )


def get_playlists(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC',
            (user_id,)
        ).fetchall()
    return rows


def get_playlist_songs(playlist_id):
    with get_connection() as conn:
        rows = conn.execute(
            '''
            SELECT liked_songs.*
            FROM playlist_songs
            JOIN liked_songs ON liked_songs.id = playlist_songs.song_id
            WHERE playlist_songs.playlist_id = ?
            ORDER BY liked_songs.added_at DESC
            ''',
            (playlist_id,)
        ).fetchall()
    return rows


# Runs (run history / recent activity)

def create_run(user_id, selected_options, matched_songs, group_count):
    with get_connection() as conn:
        conn.execute(
            '''
            INSERT INTO runs (user_id, selected_options, matched_songs, group_count)
            VALUES (?, ?, ?, ?)
            ''',
            (user_id, selected_options, matched_songs, group_count)
        )
        run_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    return run_id


def get_latest_run(user_id):
    with get_connection() as conn:
        row = conn.execute(
            'SELECT * FROM runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            (user_id,)
        ).fetchone()
    return row
