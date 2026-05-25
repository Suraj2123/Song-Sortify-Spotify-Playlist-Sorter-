import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../themes/tokens';

export const ScreenContainer = ({ children, style, translucent = false }) => {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent={translucent} />
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  inner: {
    flex: 1,
    backgroundColor: colors.background
  }
});
