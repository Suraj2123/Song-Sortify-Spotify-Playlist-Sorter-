import os
import sys

# Add project root so we can import database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from dotenv import load_dotenv
from routes.spotify import spotify_bp
from routes.lastfm import lastfm_bp
from database import db

load_dotenv()

app = Flask(__name__)

# Initialize database on startup (creates tables if they don't exist)
db.init_db()

# creates instance of the blueprint method from spotif.py and lastfm.py
app.register_blueprint(spotify_bp)
app.register_blueprint(lastfm_bp)

@app.route('/')
def index():
    return {"status": "ok"}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)