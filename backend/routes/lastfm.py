from flask import Blueprint, request, jsonify
import requests
import os

lastfm_bp = Blueprint('lastfm', __name__)

# tags (hip-hop, chill, sad, edm, 2000s, etc.)
@lastfm_bp.route('/lastfm/tags')
def get_song_tags():
    artist = request.args.get('artist')
    track = request.args.get('track')
    api_key = os.getenv('LASTFM_API_KEY')

    # http://ws.audioscrobbler.com/2.0/?method=track.getTopTags&artist=ARTIST&track=TRACK&api_key=YOUR_KEY&format=json
    response = requests.get('http://ws.audioscrobbler.com/2.0/', params={
        'method': 'track.getTopTags',
        'artist': artist,
        'track': track,
        'api_key': api_key,
        'format': 'json'
    })

    return jsonify(response.json())