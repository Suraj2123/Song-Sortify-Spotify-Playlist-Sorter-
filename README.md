# Song Sortify

A mobile app that connects to your Spotify account and automatically organizes your liked songs into custom playlists by vibe, genre, decade, or artist — in seconds.

![Opening Page](assets/README-images/ScreenLayouts/OpeningPage.png)

## Features

- **Spotify OAuth** — Secure PKCE login flow; no passwords or client secrets stored on device
- **Full library sync** — Pages through every liked song and writes it to a local database for fast, offline-style filtering
- **Vibe tagging** — Maps Spotify's audio features (energy, valence, tempo, danceability) to moods like Chill, Hype, Late Night, and Workout
- **Genre tagging** — Resolves artist genres from the Spotify API through a curated genre map (Hip-Hop, EDM, K-Pop, Latin, Lo-Fi, and more)
- **Multi-filter sorting** — Combine Vibe, Genre, Decade, and Artist filters to preview a playlist before saving
- **Direct Spotify integration** — Generated playlists are published straight to your Spotify library

## Screenshots

| Home | Create Mix | Results |
|------|-----------|---------|
| ![Home](assets/README-images/ScreenLayouts/HomePage.png) | ![Category](assets/README-images/ScreenLayouts/CategoryOptions.png) | ![Results](assets/README-images/ScreenLayouts/Results.png) |

**Settings**

![Settings](assets/README-images/ScreenLayouts/Settings.png)

**Navigation overview**

![Navigation Diagram](assets/README-images/NewUIDiagram.png)

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│   React Native / Expo    │  HTTP  │   Flask API (Python)     │
│   (SongSortify/)         │◄──────►│   (backend/)             │
│                          │        │                          │
│  SpotifyAuth.js  ──PKCE──┼───────►│  /spotify/liked-songs    │
│  SyncSongs.js            │        │  /spotify/tag-songs      │
│  CategorySelection       │        │  /spotify/sort/preview   │
│  ResultsScreen           │        │  /lastfm/tags            │
└──────────────────────────┘        └────────────┬─────────────┘
                                                 │ SQLite
                                    ┌────────────▼─────────────┐
                                    │  database/               │
                                    │  users, liked_songs,     │
                                    │  genres, song_genres,    │
                                    │  playlists, runs         │
                                    └──────────────────────────┘
```

**Frontend** (React Native + Expo) handles Spotify PKCE OAuth on-device, stores tokens in `expo-secure-store`, and calls the Flask backend for all data operations.

**Backend** (Flask) is stateless — it reads the user's Spotify access token from the `Authorization` header, proxies calls to the Spotify Web API and Last.fm API, and persists results to SQLite.

**Database** (SQLite via `database/db.py`) stores users, liked songs with metadata, genre/vibe tags, playlist history, and run logs. Foreign keys are enforced per-connection.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.81, Expo 54 |
| Navigation | React Navigation (native stack) |
| Auth | Expo AuthSession — Spotify PKCE OAuth |
| Secure storage | expo-secure-store |
| Backend | Python 3, Flask 3 |
| Database | SQLite (Python `sqlite3`) |
| External APIs | Spotify Web API, Last.fm API |
| Testing | pytest (backend), Jest + jest-expo (frontend) |
| CI | GitHub Actions |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Expo Go](https://expo.dev/go) on your iOS or Android device
- Python 3.10+
- A [Spotify account](https://www.spotify.com/) (Premium required for full playback; a free account works for liked-song access)
- A [Last.fm account](https://www.last.fm/api) for genre tagging

### Spotify API Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Under **Redirect URIs**, add `exp://localhost:8081`. Once you run Expo and see your device's local IP in the terminal, add that too (e.g. `exp://192.168.x.x:8081`).
3. Copy your **Client ID**.

### Last.fm API Setup

1. Go to [last.fm/api](https://www.last.fm/api) and request an API key.
2. Copy the **API Key**.

### Environment Variables

Copy the example files and fill in your keys:

```bash
cp SongSortify/.env.example SongSortify/.env
cp backend/.env.example backend/.env
```

See each `.env.example` for the required variable names.

### Frontend

```bash
cd SongSortify
npm install --legacy-peer-deps
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r ../requirements-dev.txt
```

### Database

```bash
python database/init_db.py
```

### Running

Start both servers in separate terminals:

```bash
# Terminal 1 — Flask backend (http://0.0.0.0:5001)
cd backend
source venv/bin/activate
python app.py

# Terminal 2 — Expo dev server
cd SongSortify
npx expo start
```

Scan the QR code with Expo Go (Android) or the iOS camera app.

> **Phone can't reach the backend?** Set `EXPO_PUBLIC_BACKEND_URL=http://<your-mac-ip>:5001` in `SongSortify/.env`. Your Mac's local IP appears in the Expo terminal output.

## Testing

```bash
# Backend — pytest (mocks all Spotify / Last.fm HTTP, uses a temp SQLite DB)
cd backend
source venv/bin/activate
pytest ../tests/ -v

# Frontend — Jest with jest-expo
cd SongSortify
npm test
```

## Design Diagrams

**UML Class Diagram**

![UML Diagram](assets/README-images/UML.drawio.png)

**Backend Class Diagram** — sort strategies implement a common `SortInterface`; `PlaylistService` depends on the abstraction rather than concrete classes (Open/Closed and Dependency Inversion from SOLID)

![Backend Diagram](assets/README-images/backend.drawio.png)

**Frontend Screen Diagram**

![Frontend Diagram](assets/README-images/frontend.drawio.png)

## Future Improvements

- **Token refresh** — silent renewal using the stored refresh token so sessions survive Spotify's 1-hour access token expiry
- **Vibe and Genre sort preview** — wire Genre and Vibe selections into `/spotify/sort/preview` (Year and Artist filters are fully supported today)
- **Live results screen** — connect the preview API response to the results list and implement the Spotify playlist creation endpoint
- **Playlist history** — surface previously generated mixes on the Home screen using the `runs` and `playlists` tables already in the DB
- **PostgreSQL migration** — drop-in replacement for SQLite to support concurrent multi-user deployments
- **Web target** — the Flask backend is already network-accessible; adding an Expo Web build would make the app browser-usable without a native install

## Author

[Suraj Yarrapathruni](https://github.com/Suraj2123)
