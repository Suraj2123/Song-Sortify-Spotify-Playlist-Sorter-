// Resolve the backend base URL from env first, then fall back to the Expo dev host.
function getDefaultBackendUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  try {
    const Constants = require('expo-constants').default;
    // Expo exposes the current dev server host, which lets the phone reach the Mac running Flask.
    const hostUri =
      Constants?.expoConfig?.hostUri ??
      Constants?.expoGoConfig?.debuggerHost ??
      Constants?.manifest2?.extra?.expoGo?.debuggerHost ??
      Constants?.manifest?.debuggerHost;
    const host = hostUri?.split(':')[0];

    if (host) {
      return `http://${host}:5001`;
    }
  } catch (error) {
    console.warn('Could not infer backend host from Expo config:', error?.message ?? error);
  }

  return 'http://127.0.0.1:5001';
}

export const BACKEND_URL = getDefaultBackendUrl();

// Backend errors may come back as JSON or plain text, so normalize both into one payload.
async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function syncSongs(token) {
  let likedResponse;

  try {
    // Sync the user's liked songs into the database.
    likedResponse = await fetch(`${BACKEND_URL}/spotify/liked-songs`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    if (BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')) {
      throw new Error(
        'Could not reach the backend. If you are using Expo Go on your phone, set EXPO_PUBLIC_BACKEND_URL to your Mac local IP, like http://192.168.x.x:5000.'
      );
    }

    throw new Error(error?.message ?? `Could not reach the backend at ${BACKEND_URL}.`);
  }

  const likedSongs = await parseResponse(likedResponse);

  if (!likedResponse.ok) {
    // Surface the backend's error message instead of a generic fetch failure.
    const message =
      likedSongs?.error ??
      likedSongs?.message ??
      (typeof likedSongs === 'string' ? likedSongs : null) ??
      `Request failed with status ${likedResponse.status}`;
    throw new Error(message);
  }

  // Return the liked-song sync result so the Settings screen can show the imported count.
  return likedSongs;
}
