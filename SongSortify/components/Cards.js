import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../themes/tokens';

const animation = {
  micro: 180,
  listStagger: 36
};

export const VibeCard = ({ label, image, isSelected, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: isSelected ? 0.95 : 1,
      duration: animation.micro,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [isSelected, scale]);

  const animatedStyle = {
    transform: [{ scale }]
  };

  return (
    <Animated.View style={[styles.vibeCardWrap, animatedStyle]}>
      <Pressable onPress={onPress} style={styles.vibeCard}>
        <Image source={{ uri: image }} style={styles.vibeImage} />
        <View style={[styles.vibeOverlay, isSelected && styles.vibeOverlaySelected]}>
          <Text style={styles.vibeLabel}>{label}</Text>
        </View>
        {isSelected ? (
          <View style={styles.vibeCheckWrap}>
            <Ionicons name="checkmark-circle" size={24} color={colors.spotifyGreen} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export const PlaylistCard = ({ playlist, onPress, index = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      delay: index * 40,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [index, opacity]);

  return (
    <Animated.View style={[styles.playlistCardWrap, { opacity }]}>
      <Pressable onPress={onPress} style={styles.playlistPressable}>
        <View style={styles.playlistArtworkWrap}>
          <Image source={{ uri: playlist.coverImage }} style={styles.playlistArtwork} />
          <View style={styles.playlistArtworkShade} />
        </View>
        <View style={styles.playlistMeta}>
          <Text numberOfLines={1} style={styles.playlistName}>
            {playlist.name}
          </Text>
          <Text style={styles.playlistSubtitle}>{playlist.songs.length} Songs</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const SongRow = ({ song, index = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * animation.listStagger,
        duration: 240,
        useNativeDriver: true
      }),
      Animated.timing(translateX, {
        toValue: 0,
        delay: index * animation.listStagger,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [index, opacity, translateX]);

  return (
    <Animated.View
      style={[
        styles.songRowWrap,
        {
          opacity,
          transform: [{ translateX }]
        }
      ]}
    >
      <Pressable style={styles.songRow}>
        <Text style={styles.songIndex}>{index + 1}</Text>
        <Image source={{ uri: song.albumArt }} style={styles.songArtwork} />
        <View style={styles.songTextWrap}>
          <Text numberOfLines={1} style={styles.songTitle}>
            {song.title}
          </Text>
          <Text numberOfLines={1} style={styles.songArtist}>
            {song.artist}
          </Text>
        </View>
        <Text style={styles.songDuration}>{song.duration}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const StatCard = ({ icon, label, value }) => (
  <View style={styles.statCard}>
    {icon}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const SettingItem = ({ icon, label, value, onPress }) => (
  <Pressable style={styles.settingItem} onPress={onPress}>
    <View style={styles.settingLeft}>
      {icon}
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <View style={styles.settingRight}>
      {!!value && <Text style={styles.settingValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  vibeCardWrap: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16
  },
  vibeCard: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  vibeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.76
  },
  vibeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  vibeOverlaySelected: {
    backgroundColor: 'rgba(0,0,0,0.48)'
  },
  vibeLabel: {
    color: '#FFFFFF',
    ...typography.h3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  vibeCheckWrap: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  playlistCardWrap: {
    width: '48%',
    marginBottom: 18
  },
  playlistPressable: {
    gap: 10
  },
  playlistArtworkWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden'
  },
  playlistArtwork: {
    width: '100%',
    height: '100%'
  },
  playlistArtworkShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  playlistMeta: {
    gap: 2
  },
  playlistName: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '700'
  },
  playlistSubtitle: {
    color: colors.textSecondary,
    ...typography.micro
  },
  songRowWrap: {
    marginBottom: 4
  },
  songRow: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  songIndex: {
    width: 20,
    textAlign: 'center',
    color: colors.textSecondary,
    ...typography.caption
  },
  songArtwork: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: '#27272A'
  },
  songTextWrap: {
    flex: 1
  },
  songTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '600'
  },
  songArtist: {
    color: colors.textSecondary,
    ...typography.caption
  },
  songDuration: {
    color: colors.textTertiary,
    ...typography.caption
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 6
  },
  statValue: {
    color: colors.textPrimary,
    ...typography.h3
  },
  statLabel: {
    color: colors.textSecondary,
    ...typography.micro
  },
  settingItem: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  settingLabel: {
    color: '#E5E7EB',
    ...typography.body
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  settingValue: {
    color: colors.textSecondary,
    ...typography.caption
  }
});
