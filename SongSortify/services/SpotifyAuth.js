import * as AuthSession from 'expo-auth-session'; // handles authorization flow (opens spotify and redirects back to the app)
import * as WebBrowser from 'expo-web-browser'; // opens the spotify login page
import * as SecureStore from 'expo-secure-store'; // stores access token

// redirects back to app after login to spotify
WebBrowser.maybeCompleteAuthSession();

// grabs id from env
const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;

// tells spotify what permissions are used for the app
const SCOPES = [
    'user-library-read', // reads the acc's liked songs
    'playlist-modify-public', // can create or add to public playlist
    'playlist-modify-private', // can create or add to private playlist
];

//tells the auth where spotify's login and token endpoints are at.
const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function useSpotifyAuth() {
    // created the URI
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('Redirect URI:', redirectUri);

    // sets up the authentication with the id, scopes, and security
    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: CLIENT_ID,
            scopes: SCOPES,
            usePKCE: true,
            redirectUri,
        },
        discovery
    );
    return { request, response, promptAsync, redirectUri };
}

// saves the access and refresh tokens on device after the login
export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync('spotify_access_token', accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync('spotify_refresh_token', refreshToken);
  }
}

// gets access token whenever an api call is made
export async function getAccessToken() {
    return await SecureStore.getItemAsync('spotify_access_token');
}

// deletes all the tokens when the user logs out
export async function clearTokens() {
    await SecureStore.deleteItemAsync('spotify_access_token');
    await SecureStore.deleteItemAsync('spotify_refresh_token');
}

// Tokens are used for when a user logs into their spotify account, it gives them two tokens:
// access tokens is a temp token that allows the app to make api calls, and it expires after 1 hour
// refresh tokens are used to get new access tokens when it expires which prevents the user to login again

// PKCE (Proof Key for Code Exchange) security method for apps, replaces client secret with a randomly generated code