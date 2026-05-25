from flask import Blueprint, request, jsonify
import requests
from database import db
from .genre_map import GENRE_MAP

# used to register all routes at once
spotify_bp = Blueprint('spotify', __name__)


def _extract_token():
    """Read bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header.replace('Bearer ', '', 1).strip()


def _year_bucket(year):
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

# defined the url so the frontend will get the liked songs
@spotify_bp.route('/spotify/liked-songs')
def get_liked_songs():
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    headers = {'Authorization': f'Bearer {token}'}

    # Get current user from Spotify
    me_response = requests.get('https://api.spotify.com/v1/me', headers=headers)
    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    me_data = me_response.json()
    spotify_id = me_data.get('id')
    display_name = me_data.get('display_name', '')
    email = me_data.get('email', '')

    # Create or get user in database
    user = db.get_user_by_spotify_id(spotify_id)
    if user is None:
        user_id = db.create_user(spotify_id, display_name, email or f'{spotify_id}@spotify.user')
    else:
        user_id = user[0]

    # stores all the liked songs
    all_items = []
    url = 'https://api.spotify.com/v1/me/tracks'
    params = {'limit': 50} # returns 50 songs instead of 20 per page

    while url:
        response = requests.get(url, headers=headers, params=params) # gets current page of all 50 songs
        if response.status_code != 200:
            return jsonify(response.json()), response.status_code
        data = response.json()
        all_items.extend(data.get('items', [])) # adds the 50 songs into the list
        url = data.get('next') # returns URL to the next page
        params = {} # clears the params

    # stores all the songs into the database
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

# maps the songs to the vibe
# spotify has a feature where it grab numerical values from its api which are attached to songs
def map_vibes(af): # audio features (af) , returns numerical values
    vibes = []
    energy = af.get('energy', 0)
    valence = af.get('valence', 0) # emotional positivity
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
    if valence >= 0.4 and valence <= 0.7 and energy < 0.5:
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

def map_genres(spotify_genres): # list of genre strings the spotify returns, like 'rap', 'hiphop'
    matched = set() # prevents duplicated genres
    for spotify_genre in spotify_genres:
        spotify_genre_lower = spotify_genre.lower()
        for key, value in GENRE_MAP.items():
            if key in spotify_genre_lower:
                matched.add(value)
    return list(matched)

@spotify_bp.route('/spotify/tag-songs')
def tag_songs():
    # gets the token again from frontend to find the account
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401
    headers = {'Authorization': f'Bearer {token}'}

    # similar to the route before, it gets the user
    me_response = requests.get('https://api.spotify.com/v1/me', headers=headers)
    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code
    spotify_id = me_response.json().get('id')
    user = db.get_user_by_spotify_id(spotify_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user_id = user[0]

    # gets the liked songs based on the user
    songs = db.get_liked_songs(user_id) # pulls tuple id[0], user_id[1], spotify_track_id[1], title[3], artist[4], album[5], year[5], duration_ms[7], added_at[8]
    if not songs:
        return jsonify({'error': 'No liked songs found'}), 404
    
    track_map = {song[2]: song[0] for song in songs} # creates a dictionary for the songs 'song: songid'
    track_ids = list(track_map.keys()) # creates a list of all the songs that it pulled

    # from spotify api documentation: endpoints only accept 100 songs at a time
    # for loop splits the list into different lists essentially, with 100 songs
    # EX: 0-99, 100-199, etc.
    for i in range(0, len(track_ids), 100):
        batch = track_ids[i:i+100] # grabs the current list of 100 songs

        # returns the audio features function (bpm, instrumentalness, etc.)
        af_response = requests.get(
            'https://api.spotify.com/v1/audio-features',
            headers=headers,
            params={'ids': ','.join(batch)}
        )
        if af_response.status_code != 200:
            continue
        # turns into json and adds the audio features based on the song
        # 'id': 'track1', 'energy': 0.8, 'valence': 0.3, ...
        for af in af_response.json().get('audio_features', []): # loops through each song audio
            # sometimes theres no audio features, will fix later
            if not af:
                continue
            song_id = track_map.get(af['id']) # gets song from dictionary
            if not song_id:
                continue
            for vibe in map_vibes(af):
                genre_id = db.get_or_create_genre(vibe, 'vibe')
                db.add_song_genre(song_id, genre_id) # links song to the vibe

    # dictionary for artists to song ids
    # useful b/c artists have multiple songs
    artist_id_map = {}

    # only accepts 50
    for i in range(0, len(track_ids), 50):
        batch = track_ids[i:i+50]
        # gets the track id
        tracks_response = requests.get(
            'https://api.spotify.com/v1/tracks',
            headers=headers,
            params={'ids': ','.join(batch)}
        )
        if tracks_response.status_code != 200:
            continue
        # gets track id to look up song id in the track map and gets the artist id
        for track in tracks_response.json().get('tracks', []):
            if not track:
                continue
            track_id = track.get('id')
            song_id = track_map.get(track_id)
            # goes into the artists list and grabs the first artist id
            artist_id = track.get('artists', [{}])[0].get('id') if track.get('artists') else None
            # ensures artist and song id are found
            if artist_id and song_id:
                # if the artist id isnt in the list
                if artist_id not in artist_id_map:
                    artist_id_map[artist_id] = []
                # adds song id to artist id
                artist_id_map[artist_id].append(song_id)

    # unique artist ids into list
    artist_ids = list(artist_id_map.keys())

    # goes in batches, 50 artist ids
    for i in range(0, len(artist_ids), 50):
        batch = artist_ids[i:i+50]
        # gets the genre data for all the 50 artists that are pulled
        artists_response = requests.get(
            'https://api.spotify.com/v1/artists',
            headers=headers,
            params={'ids': ','.join(batch)}
        )
        if artists_response.status_code != 200:
            continue
        # goes through the artists
        for artist in artists_response.json().get('artists', []):
            if not artist:
                continue
            # gets the id
            artist_id = artist.get('id')
            # gets all the songs by this artists within liked songs
            for song_id in artist_id_map.get(artist_id, []):
                # iterates through map_genres and returns something like ['Hip-Hop']
                for genre in map_genres(artist.get('genres', [])):
                    # creates or finds the genre within the database
                    genre_id = db.get_or_create_genre(genre, 'genre')
                    # links the song id the the genre
                    db.add_song_genre(song_id, genre_id)

    return jsonify({'status': 'done', 'tagged': len(songs)})


@spotify_bp.route('/spotify/sort/preview', methods=['POST'])
def sort_preview():
    """
    Preview sorting output using Year and Artist filters.
    Requires songs to be synced first via /spotify/liked-songs.
    """
    token = _extract_token()
    if not token:
        return jsonify({'error': 'Missing Authorization header'}), 401

    payload = request.get_json(silent=True) or {}
    selected_options = payload.get('selected_options', {})
    selected_year_values = selected_options.get('Year', [])
    selected_years = set(selected_year_values)
    selected_artists = set(selected_options.get('Artist', []))

    # alllow both decades and specific years 
    selected_exact_years = set()
    for value in selected_year_values:
        value_text = str(value).strip()
        if value_text.isdigit():
            selected_exact_years.add(int(value_text))

    headers = {'Authorization': f'Bearer {token}'}
    me_response = requests.get('https://api.spotify.com/v1/me', headers=headers)
    if me_response.status_code != 200:
        return jsonify(me_response.json()), me_response.status_code

    spotify_id = me_response.json().get('id')
    user = db.get_user_by_spotify_id(spotify_id)
    if user is None:
        return jsonify({
            'error': 'User not synced yet',
            'hint': 'Call /spotify/liked-songs first to sync songs'
        }), 400

    user_id = user[0]
    songs = db.get_liked_songs(user_id)

    grouped = {}
    matched_count = 0

    for song in songs:
        # columns:
        # id, user_id, spotify_track_id, title, artist, album, year, duration_ms, added_at
        song_id = song[2]
        title = song[3]
        artist = song[4] or 'Unknown Artist'
        # Works for both schemas (year is third-from-last column).
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
            'year_label': year_label
        })

    return jsonify({
        'status': 'ok',
        'user_id': user_id,
        'total_songs': len(songs),
        'matched_songs': matched_count,
        'group_count': len(grouped),
        'groups': grouped
    })
