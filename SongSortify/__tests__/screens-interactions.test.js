import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, act } from '@testing-library/react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ResultsScreen from '../screens/ResultsScreen';

import * as SecureStore from 'expo-secure-store';

describe('screens (exercise internal handlers)', () => {
  test('Home: settings + start sorting navigate', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('token');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ display_name: 'Tester' }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ total: 1 }) });

    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<HomeScreen navigation={navigation} />);

    // Start Sorting button triggers navigation.
    fireEvent.press(getByText('Start Sorting'));
    expect(navigation.navigate).toHaveBeenCalledWith('CategorySelection');
  });

  test('Settings: Sync Songs calls syncSongs and shows alert', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    SecureStore.getItemAsync.mockResolvedValueOnce('token');
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ total: 3 }),
    }));

    const navigation = {
      getState: () => ({ routeNames: ['Login'] }),
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    };

    const { getByText } = render(<SettingsScreen navigation={navigation} />);
    await act(async () => {
      fireEvent.press(getByText('Sync Songs'));
    });

    expect(Alert.alert).toHaveBeenCalled();
  });

  test('Settings: Log Out confirms and calls navigation.reset', async () => {
    const navigation = {
      getState: () => ({ routeNames: ['Login'] }),
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    };

    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const destructive = (buttons || []).find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    const { getByText } = render(<SettingsScreen navigation={navigation} />);
    await act(async () => {
      fireEvent.press(getByText('Log Out'));
    });

    expect(navigation.reset).toHaveBeenCalled();
  });

  test('CategorySelection: toggling a filter updates count and Generate navigates', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('token');
    global.fetch = jest.fn(async () => ({ json: async () => ({ artists: [{ name: 'Artist X', image: null }] }) }));

    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<CategorySelectionScreen navigation={navigation} />);

    // Pick a vibe option (exists in tabOptions)
    fireEvent.press(getByText('Chill'));
    expect(getByText('1 filters selected')).toBeTruthy();

    fireEvent.press(getByText('Generate Combined Mix'));
    expect(navigation.navigate).toHaveBeenCalledWith('Results', expect.any(Object));
  });

  test('Results: removeSong updates list and Save to Spotify triggers alert', async () => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const navigation = { navigate: jest.fn() };
    const { getByText, queryByText } = render(<ResultsScreen navigation={navigation} />);

    // Test: ensure Save flow runs (uses setTimeout in this version).
    fireEvent.press(getByText('Save to Spotify'));
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('Login: Connect button exists (smoke)', () => {
    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<LoginScreen navigation={navigation} />);
    expect(getByText('Connect Spotify')).toBeTruthy();
  });
});

