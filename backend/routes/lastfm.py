from flask import Blueprint, request, jsonify
from typing import Any
import requests
import os

lastfm_bp = Blueprint('lastfm', __name__)


@lastfm_bp.route('/lastfm/tags')
def get_song_tags() -> Any:
    artist = request.args.get('artist', '').strip()
    track = request.args.get('track', '').strip()

    if not artist or not track:
        return jsonify({'error': 'artist and track query parameters are required'}), 400

    api_key = os.getenv('LASTFM_API_KEY')
    if not api_key:
        return jsonify({'error': 'Last.fm API key not configured on the server'}), 500

    try:
        response = requests.get(
            'http://ws.audioscrobbler.com/2.0/',
            params={
                'method': 'track.getTopTags',
                'artist': artist,
                'track': track,
                'api_key': api_key,
                'format': 'json',
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.Timeout:
        return jsonify({'error': 'Last.fm request timed out'}), 504
    except requests.RequestException as exc:
        return jsonify({'error': f'Last.fm request failed: {exc}'}), 502

    data = response.json()
    if 'error' in data:
        return jsonify({
            'error': data.get('message', 'Last.fm returned an error'),
            'code': data['error'],
        }), 502

    return jsonify(data)
