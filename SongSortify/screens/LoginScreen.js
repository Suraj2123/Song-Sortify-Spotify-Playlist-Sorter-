import { StatusBar } from 'expo-status-bar'; // status bar of the phone
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native'; // css, text, containers, buttons, alerts
import { useEffect } from 'react'; // runs code when something changes
import * as AuthSession from 'expo-auth-session'; //imports Oauth 
import { useSpotifyAuth, saveTokens } from '../services/SpotifyAuth'; // imports functions from SpotifyAuth.js

export default function LoginScreen({ navigation }) {
  const { request, response, promptAsync, redirectUri } = useSpotifyAuth(); // calls function from SpotifyAuth.js

  const logo = require('../assets/SongSortifyLogo.png')

  useEffect(() => { // whenever spotify sends something back, the login is successful
    if (response?.type === 'success') {
      const { code } = response.params;

      // Sends the auth code to spotify's token and turns it into an access token and refresh token
      AuthSession.exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
          code,
          extraParams: { code_verifier: request.codeVerifier },
          redirectUri: redirectUri,
        },
        { tokenEndpoint: 'https://accounts.spotify.com/api/token' }
      ).then(async (tokenResponse) => { // saves the auth tokens if its successful, and shows an alert
        await saveTokens(tokenResponse.accessToken, tokenResponse.refreshToken);
        Alert.alert('Success', 'Connected to your Spotify Account!');
        navigation.navigate('Home');
      }).catch((err) => { // catches errors
        Alert.alert('Error', 'Failed to connect: ' + err.message);
      });
    }
  }, [response]);
  return (
    <View style={styles.container}>
    <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Song Sortify</Text>
      <Text style={styles.textDesc}>
        Automatically organize your liked songs into{'\n'}custom playlists based on vibe.
      </Text>
      <TouchableOpacity
        style={styles.button}
        disabled={!request}
        onPress={() => promptAsync()}
      >
        <Text style={styles.buttonText}>Connect Spotify</Text>
      </TouchableOpacity>
      <StatusBar style='light' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: -80,
  },

  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  textDesc: {
    color: '#979494',
    textAlign: 'center',
    fontSize: 16,
    width: '75%',
    marginBottom: 30,
  },

  buttonText: {
    color: '#000',
    fontSize: 18,
  },

  button: {
    backgroundColor: '#1DB954',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '70%',
    alignItems: 'center',
  }
});
