import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { useSpotifyAuth, saveTokens, getAccessToken, clearTokens } from '../services/SpotifyAuth';
import { syncSongs } from '../services/SyncSongs';

describe('SongSortify services (basic coverage)', () => {
  test('SpotifyAuth exports work', async () => {
    // Test: the auth hook returns the expected shape and the token helpers
    // store/read/delete values in SecureStore (all mocked).
    const auth = useSpotifyAuth();
    expect(WebBrowser.maybeCompleteAuthSession).toHaveBeenCalled();
    expect(AuthSession.makeRedirectUri).toHaveBeenCalledWith({ useProxy: true });
    expect(auth).toHaveProperty('request');
    expect(auth).toHaveProperty('promptAsync');

    await saveTokens('a', 'r');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('spotify_access_token', 'a');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('spotify_refresh_token', 'r');

    SecureStore.getItemAsync.mockResolvedValueOnce('token123');
    await expect(getAccessToken()).resolves.toBe('token123');

    await clearTokens();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('spotify_access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('spotify_refresh_token');
  });

  test('syncSongs calls backend and returns JSON', async () => {
    // Test: SyncSongs parses a JSON response body and returns the object.
    // We mock `fetch` so no network is used.
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ total: 5 }),
    }));

    await expect(syncSongs('token')).resolves.toEqual({ total: 5 });
    expect(global.fetch).toHaveBeenCalled();
  });
});

