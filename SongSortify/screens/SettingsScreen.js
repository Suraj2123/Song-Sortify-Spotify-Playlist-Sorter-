import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SettingItem } from '../components/Cards';
import { ScreenContainer } from '../components/ScreenContainer';
import { clearTokens, getAccessToken } from '../services/SpotifyAuth';
import { syncSongs } from '../services/SyncSongs';
import { colors, typography } from '../themes/tokens';

export default function SettingsScreen({ navigation }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const navigateOrAlert = (routeName, label) => {
    const routeNames = navigation.getState()?.routeNames ?? [];
    if (routeNames.includes(routeName)) {
      navigation.navigate(routeName);
      return;
    }

    Alert.alert('Coming soon', `${label} is not set up yet.`);
  };

  const onLogout = async () => {
    try {
      await clearTokens();
    } catch (error) {
      console.warn('Failed to clear tokens on logout:', error?.message ?? error);
    } finally {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  const onSyncSongs = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error('No Spotify access token found. Please log in again.');
      }

      const likedSongs = await syncSongs(token);
      const syncedCount = likedSongs?.total ?? 0;

      Alert.alert(
        'Sync complete',
        `Synced ${syncedCount} liked songs into the database.`
      );
    } catch (error) {
      Alert.alert('Sync failed', error?.message ?? 'Could not sync songs.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ScreenContainer>
      <Header
        title="Settings"
        leftAction={
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back-ios" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Library</Text>
          <View style={styles.group}>
            <SettingItem
              icon={<MaterialIcons name="sync" size={20} color="#22C55E" />}
              label="Sync Songs"
              value={isSyncing ? 'Syncing...' : undefined}
              onPress={isSyncing ? undefined : onSyncSongs}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.group}>
            <SettingItem
              icon={<MaterialIcons name="security" size={20} color="#60A5FA" />}
              label="Privacy & Security"
              onPress={() => navigateOrAlert('Privacy', 'Privacy & Security')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Playback</Text>
          <View style={styles.group}>
            <SettingItem
              icon={<MaterialIcons name="dark-mode" size={20} color="#FBBF24" />}
              label="Dark Mode"
              value="Always On"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.group}>
            <SettingItem
              icon={<MaterialIcons name="help-outline" size={20} color="#A1A1AA" />}
              label="Help Center"
              onPress={() => navigateOrAlert('Help', 'Help Center')}
            />
            <SettingItem
              icon={<MaterialIcons name="description" size={20} color="#A1A1AA" />}
              label="Terms & Privacy"
              onPress={() => navigateOrAlert('Terms', 'Terms & Privacy')}
            />
          </View>
        </View>

        <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Song Sortify v1.0.2 (Build 240)</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 18,
    paddingBottom: 42
  },
  section: {
    gap: 10
  },
  sectionLabel: {
    color: colors.textSecondary,
    ...typography.micro,
    textTransform: 'uppercase',
    paddingLeft: 4
  },
  group: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 1,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  logoutButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)'
  },
  logoutLabel: {
    color: colors.danger,
    ...typography.body,
    fontWeight: '700'
  },
  version: {
    color: '#66666F',
    ...typography.micro,
    textAlign: 'center',
    marginTop: 8
  }
});
