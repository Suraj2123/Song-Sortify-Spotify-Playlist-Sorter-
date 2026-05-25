import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import { useSpotifyAuth, saveTokens } from '../services/SpotifyAuth';

// color pallete
export const colors = {
  background: '#121212',
  backgroundAlt: '#0A0A0A',
  spotifyGreen: '#1DB954',
  spotifyGreenBright: '#1ED760',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#71717A',
  card: '#1B1B1B',
  borderSoft: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.2)',
  danger: '#EF4444',
  blue: '#3B82F6',
  purple: '#A855F7'
};
// for the corner rounding
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};
// round the shapes out
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
};

export const typography = {
  hero: { fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1.1 }
};


// defines the login screen
export default function LoginScreen() {
  const { request, response, promptAsync } = useSpotifyAuth();
  const logo = require('../assets/SongSortifyLogo.png');
// runs token exchange whenever spotify auth response changes
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;

      AuthSession.exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
          code,
          extraParams: { code_verifier: request.codeVerifier },
          redirectUri: AuthSession.makeRedirectUri(),
        },
        { tokenEndpoint: 'https://accounts.spotify.com/api/token' }
      )
        .then(async (tokenResponse) => {
          await saveTokens(tokenResponse.accessToken, tokenResponse.refreshToken);
          Alert.alert('Success', 'Connected to your Spotify Account!');
        })
        .catch((err) => {
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

      <TouchableOpacity style={styles.button} disabled={!request} onPress={() => promptAsync()}>
        <Text style={styles.buttonText}>Connect Spotify</Text>
      </TouchableOpacity>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
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
    color: colors.textPrimary,
    ...typography.h1,
    marginBottom: spacing.lg,
  },

  textDesc: {
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
    width: '75%',
    marginBottom: spacing.xxxl,
  },

  button: {
    backgroundColor: colors.spotifyGreen,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    width: '70%',
    alignItems: 'center',
  },

  buttonText: {
    color: colors.backgroundAlt,
    fontSize: 18,
    fontWeight: '600',
  },
});

