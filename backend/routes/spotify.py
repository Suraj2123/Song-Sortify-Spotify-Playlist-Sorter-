from flask import Blueprint, request, jsonify
from typing import Any
import logging
import requests
from database import db
from .genre_map import GENRE_MAP

logger = logging.getLogger(__name__)

spotify_bp = Blueprint('spotify', __name__)

_REQUEST_TIMEOUT = 10  # seconds


def _extract_token() -> str | None:
    """Read bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header.replace('Bearer ', '', 1).strip()


def _year_bucket(year: int | None) -> str:
    if year is None:
        return 'Unknown'
    if year >= 2020:
        return '2020s'
    if year >= 2010:
        return '2010s'
    if year >= 2000:
        return '2000s'
    if year >= 1990:
        return '1990s'
    if year >= 1980:
        return '1980s'
    return 'Older'


def map_vibes(af: dict) -> list[str]:
    vibes: list[str] = []
    energy = af.get('energy', 0)
    valence = af.get('valence', 0)
    danceability = af.get('danceability', 0)
    tempo = af.get('tempo', 0)
    instrumentalness = af.get('instrumentalness', 0)
    acousticness = af.get('acousticness', 0)

    if energy < 0.4:
        vibes.append('Chill')
    if valence > 0.7:
        vibes.append('Upbeat')
    if valence < 0.3:
        vibes.append('Sad')
    if energy > 0.8 and valence >= 0.4 and danceability > 0.6:
        vibes.append('Hype')
    if 0.4 <= valence <= 0.7 and energy < 0.5:
        vibes.append('Romantic')
    if energy > 0.8 and valence < 0.4:
        vibes.append('Aggressive')
    if energy > 0.7 and tempo > 120:
        vibes.append('Workout')
    if instrumentalness > 0.3:
        vibes.append('Focus')
    if danceability > 0.7:
        vibes.append('Party')
    if energy < 0.4 and valence < 0.4 and tempo < 105:
        vibes.append('Late Night')
    if acousticness > 0.6 and energy < 0.5:
        vibes.append('Melodic')

    return vibes


def map_genres(spotify_genres: list[str]) -> list[str]:
    matched: set[str] = set()
    for spotify_genre in spotify_genres:
        spotify_genre_lower = spotify_genre.lower()
        for key, value in GENRE_MAP.items():
            if key in spotify_genre_lower:
                matched.add(value)
    return list(matched)


@spotify_bp.route('/spotify/liked-songs')
def get_liked_songs() -> Any:
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    headers = {'Authorization': f'Bearer {token}'}

    try:
        me_response = requests.get(
            'https://api.spotify.com/v1/me', headers=headers, timeout=_REQUEST_TIMEOUT
        )
    except requests.Timeout:
        return jsonify({'error': 'Spotify request timed out'}), 504
    except requests.RequestException as exc:
        return jsonify({'error': f'Spotify request failed: {exc}'}), 502

    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    me_data = me_response.json()
    spotify_id = me_data.get('id')
    display_name = me_data.get('display_name', '')
    email = me_data.get('email', '')

    user = db.get_user_by_spotify_id(spotify_id)
    if user is None:
        user_id = db.create_user(spotify_id, display_name, email or f'{spotify_id}@spotify.user')
    else:
        user_id = user[0]

    all_items: list = []
    url: str | None = 'https://api.spotify.com/v1/me/tracks'
    params: dict = {'limit': 50}

    while url:
        try:
            response = requests.get(url, headers=headers, params=params, timeout=_REQUEST_TIMEOUT)
        except requests.Timeout:
            return jsonify({'error': 'Spotify request timed out while fetching liked songs'}), 504
        except requests.RequestException as exc:
            return jsonify({'error': f'Spotify request failed: {exc}'}), 502

        if response.status_code != 200:
            return jsonify(response.json()), response.status_code

        data = response.json()
        all_items.extend(data.get('items', []))
        url = data.get('next')
        params = {}

    db.delete_user_liked_songs(user_id)
    for item in all_items:
        track = item.get('track')
        if track:
            track_id = track.get('id')
            title = track.get('name', '')
            artist = track.get('artists', [{}])[0].get('name', '') if track.get('artists') else ''
            album_data = track.get('album') or {}
            album_name = album_data.get('name')
            release_date = album_data.get('release_date', '')
            year = int(str(release_date)[:4]) if str(release_date)[:4].isdigit() else None
            duration_ms = track.get('duration_ms')
            if track_id:
                db.add_liked_song(user_id, track_id, title, artist, album_name, year, duration_ms)

    return jsonify({'items': all_items, 'total': len(all_items)})


@spotify_bp.route('/spotify/tag-songs')
def tag_songs() -> Any:
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    headers = {'Authorization': f'Bearer {token}'}

    try:
        me_response = requests.get(
            'https://api.spotify.com/v1/me', headers=headers, timeout=_REQUEST_TIMEOUT
        )
    except requests.Timeout:
        return jsonify({'error': 'Spotify request timed out'}), 504
    except requests.RequestException as exc:
        return jsonify({'error': f'Spotify request failed: {exc}'}), 502

    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    spotify_id = me_response.json().get('id')
    user = db.get_user_by_spotify_id(spotify_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user_id = user[0]

    songs = db.get_liked_songs(user_id)
    if not songs:
        return jsonify({'error': 'No liked songs found'}), 404

    track_map: dict[str, int] = {song[2]: song[0] for song in songs}
    track_ids = list(track_map.keys())

    for i in range(0, len(track_ids), 100):
        batch = track_ids[i:i + 100]
        try:
            af_response = requests.get(
                'https://api.spotify.com/v1/audio-features',
                headers=headers,
                params={'ids': ','.join(batch)},
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            logger.warning('Audio-features batch %d failed: %s', i, exc)
            continue

        if af_response.status_code != 200:
            logger.warning('Audio-features batch %d returned %d', i, af_response.status_code)
            continue

        for af in af_response.json().get('audio_features', []):
            if not af:
                continue
            song_id = track_map.get(af['id'])
            if not song_id:
                continue
            for vibe in map_vibes(af):
                genre_id = db.get_or_create_genre(vibe, 'vibe')
                db.add_song_genre(song_id, genre_id)

    artist_id_map: dict[str, list[int]] = {}

    for i in range(0, len(track_ids), 50):
        batch = track_ids[i:i + 50]
        try:
            tracks_response = requests.get(
                'https://api.spotify.com/v1/tracks',
                headers=headers,
                params={'ids': ','.join(batch)},
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            logger.warning('Tracks batch %d failed: %s', i, exc)
            continue

        if tracks_response.status_code != 200:
            logger.warning('Tracks batch %d returned %d', i, tracks_response.status_code)
            continue

        for track in tracks_response.json().get('tracks', []):
            if not track:
                continue
            track_id = track.get('id')
            song_id = track_map.get(track_id)
            artist_id = (
                track.get('artists', [{}])[0].get('id') if track.get('artists') else None
            )
            if artist_id and song_id:
                artist_id_map.setdefault(artist_id, []).append(song_id)

    artist_ids = list(artist_id_map.keys())

    for i in range(0, len(artist_ids), 50):
        batch = artist_ids[i:i + 50]
        try:
            artists_response = requests.get(
                'https://api.spotify.com/v1/artists',
                headers=headers,
                params={'ids': ','.join(batch)},
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            logger.warning('Artists batch %d failed: %s', i, exc)
            continue

        if artists_response.status_code != 200:
            logger.warning('Artists batch %d returned %d', i, artists_response.status_code)
            continue

        for artist in artists_response.json().get('artists', []):
            if not artist:
                continue
            artist_id = artist.get('id')
            for song_id in artist_id_map.get(artist_id, []):
                for genre in map_genres(artist.get('genres', [])):
                    genre_id = db.get_or_create_genre(genre, 'genre')
                    db.add_song_genre(song_id, genre_id)

    return jsonify({'status': 'done', 'tagged': len(songs)})


@spotify_bp.route('/spotify/artists')
def get_artists() -> Any:
    """Return artists that appear 5+ times in the user's liked songs."""
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    headers = {'Authorization': f'Bearer {token}'}

    try:
        me_response = requests.get(
            'https://api.spotify.com/v1/me', headers=headers, timeout=_REQUEST_TIMEOUT
        )
    except requests.Timeout:
        return jsonify({'error': 'Spotify request timed out'}), 504
    except requests.RequestException as exc:
        return jsonify({'error': f'Spotify request failed: {exc}'}), 502

    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    spotify_id = me_response.json().get('id')
    user = db.get_user_by_spotify_id(spotify_id)
    if not user:
        return jsonify({
            'error': 'User not found',
            'hint': 'Sync songs first via Settings → Sync Songs',
        }), 404

    artists = db.get_user_artists(user[0], min_count=5)
    return jsonify({'artists': artists})


@spotify_bp.route('/spotify/sort/preview', methods=['POST'])
def sort_preview() -> Any:
    """Preview sort groupings for selected Year and Artist filters."""
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    payload = request.get_json(silent=True) or {}
    selected_options = payload.get('selected_options', {})
    selected_year_values = selected_options.get('Year', [])
    selected_years = set(selected_year_values)
    selected_artists = set(selected_options.get('Artist', []))

    selected_exact_years: set[int] = set()
    for value in selected_year_values:
        value_text = str(value).strip()
        if value_text.isdigit():
            selected_exact_years.add(int(value_text))

    headers = {'Authorization': f'Bearer {token}'}

    try:
        me_response = requests.get(
            'https://api.spotify.com/v1/me', headers=headers, timeout=_REQUEST_TIMEOUT
        )
    except requests.Timeout:
        return jsonify({'error': 'Spotify request timed out'}), 504
    except requests.RequestException as exc:
        return jsonify({'error': f'Spotify request failed: {exc}'}), 502

    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    spotify_id = me_response.json().get('id')
    user = db.get_user_by_spotify_id(spotify_id)
    if user is None:
        return jsonify({
            'error': 'User not synced yet',
            'hint': 'Call /spotify/liked-songs first to sync songs',
        }), 400

    user_id = user[0]
    songs = db.get_liked_songs(user_id)

    grouped: dict[str, list] = {}
    matched_count = 0

    for song in songs:
        # liked_songs columns: id, user_id, spotify_track_id, title, artist,
        #                       artist_id, artist_image, album, year, duration_ms, added_at
        song_id = song[2]
        title = song[3]
        artist = song[4] or 'Unknown Artist'
        year = song[-3]
        decade = _year_bucket(year)

        year_match = (
            not selected_year_values
            or decade in selected_years
            or (year is not None and year in selected_exact_years)
        )
        artist_match = not selected_artists or artist in selected_artists
        if not (year_match and artist_match):
            continue

        matched_count += 1
        year_label = str(year) if year is not None and year in selected_exact_years else decade
        bucket_key = f'{year_label} - {artist}'
        grouped.setdefault(bucket_key, []).append({
            'spotify_track_id': song_id,
            'title': title,
            'artist': artist,
            'year': year,
            'decade': decade,
            'year_label': year_label,
        })

    return jsonify({
        'status': 'ok',
        'user_id': user_id,
        'total_songs': len(songs),
        'matched_songs': matched_count,
        'group_count': len(grouped),
        'groups': grouped,
    })
