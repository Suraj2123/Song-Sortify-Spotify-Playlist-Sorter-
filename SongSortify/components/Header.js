import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../themes/tokens';

export const Header = ({ title, leftAction, rightAction, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.actionSlot}>{leftAction}</View>
      <Text numberOfLines={1} style={styles.title}>
        {title || ''}
      </Text>
      <View style={[styles.actionSlot, styles.right]}>{rightAction}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(18,18,18,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  actionSlot: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  right: {
    alignItems: 'flex-end'
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    ...typography.title,
    fontWeight: '700'
  }
});
