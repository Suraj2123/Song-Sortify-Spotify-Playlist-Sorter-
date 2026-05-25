import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // icons.expo.fyi
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState, useEffect } from 'react';
import { getAccessToken } from '../services/SpotifyAuth';
export default function HomeScreen({ navigation }) {

  const [username, setUsername] = useState('');
  const [likedSongs, setLikedSongs] = useState(0);


  useEffect(() => { // useEffect runs when the screen loads
    async function fetchSpotifyData() {

      try {
        const token = await getAccessToken(); // gets token
        console.log('Token:', token);

        // /v1/me means your profile
        // v1/me/trakcs means it gets your liked songs
        
        // get username
        const profileRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` } // Bearer is a authorization header, meaning it gives permission to access the data
        });
        console.log('Profile status:', profileRes.status);
        if (profileRes.status !== 200) return;
        const profile = await profileRes.json();
        setUsername(profile.display_name);

        const likedRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Liked status:', likedRes.status);
        if (likedRes.status !== 200) return;
        const liked = await likedRes.json();
        setLikedSongs(liked?.total ?? 0); // sets likedSongs variable with liked
      } catch (err) {
        console.log('Error:', err.message);
      }
    }

    fetchSpotifyData();
  }, []);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Ionicons name="settings-outline" size={30} color="#9ca3af" />
            </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
        <ScrollView contentContainerStyle={styles.scrollContent}>

            {/* Welcome */}
            <Text style={styles.welcomeBack}>Welcome back,</Text>
            <Text style={styles.username}>{username}</Text>

            {/* Liked Songs */}
            <View style={styles.likedBubble}>
                <View style={styles.greenDot} />
                <Text style={styles.likedText}>{(likedSongs ?? 0).toLocaleString()} Liked Songs</Text>
            </View>

            {/* Mixes */}
            <View style={styles.createCard}>
                <View>
                    <Text style={styles.createTitle}>Create New Mix</Text>
                    <Text style={styles.createSubtitle}>Sort by Vibe, Genre or Mood</Text>
                    <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('CategorySelection')}>
                        <Text style={styles.startButtonText}>Start Sorting</Text>
                    </TouchableOpacity>
                </View>
                <Ionicons name="add" size={90} color="#ffffff55" />
            </View>

            {/* Your Mixes */}
            <View>
              <Text style={styles.yourMixesText}>Your Mixes</Text>
            </View>
            <View style={styles.noPlaylistCard}>
              <Text style={styles.noPlaylistText}>No playlist yet.</Text>
              <Text style={styles.createFirstMixText}>Create your first vibe mix!</Text>
            </View>

      
        </ScrollView>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  settingsRow: {
    alignItems: "flex-end",
    marginTop: 40,    
  },
  
  welcomeBack: {
    color: "#9ca3af",
    fontSize: 18,
    marginTop: 20,
  },

  username: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 10,
  },

  likedBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 14,
    borderWidth: .2,
    borderColor: '#9ca3af',
  },

  greenDot: {
    width: 10,
    height: 10,
    backgroundColor: "#22c55e",
    borderRadius: 5,
    marginRight: 8,
  },

  likedText: {
    color: "#9ca3af",
  },

  createCard: {
    backgroundColor: "#15803d",
    borderRadius: 20,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
  },

  createTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  
  createSubtitle: {
    color: "#bbf7d0",
    marginBottom: 15,
  },

  startButton: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },

  startButtonText: {
    fontWeight: "bold",
    textAlign: 'center',
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    height: 140,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#22c55e",
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  cardDot: {
    width: 18,
    height: 18,
    backgroundColor: "#22c55e",
    borderRadius: 9,
    position: "absolute",
    top: 10,
    right: 10,
  },

  cardText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },

  top: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },

  headerDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  yourMixesText: {
    color: 'white',
    paddingTop: 30,
    fontWeight: 'bold',
    fontSize: 23,
  },

  noPlaylistText: {
    color: '#9ca3af',
    fontSize: 20
  },

  createFirstMixText: {
    color: '#9ca3af',
    fontSize: 15,
    marginTop: 6,
  },

  noPlaylistCard: {
    backgroundColor: '#1f1f1f',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 170,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: .8,
    borderColor:'#3b3a3a',
  }
  
});
