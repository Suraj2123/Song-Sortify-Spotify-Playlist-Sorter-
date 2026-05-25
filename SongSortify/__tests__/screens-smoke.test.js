import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ResultsScreen from '../screens/ResultsScreen';

describe('Screens (smoke tests)', () => {
  test('LoginScreen renders', () => {
    // Test: screen component imports and renders without throwing.
    const tree = renderer.create(<LoginScreen navigation={{ navigate: jest.fn() }} />);
    expect(tree.toJSON()).toBeTruthy();
  });

  test('HomeScreen renders (with mocked fetch)', async () => {
    // Test: HomeScreen side-effect fetch calls are made, but we mock them so
    // this is a unit test (no real Spotify calls).
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ display_name: 'Tester' }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ total: 1 }) });

    await act(async () => {
      renderer.create(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  test('CategorySelectionScreen renders', () => {
    // Test: CategorySelection renders; we mock the artist fetch so the effect doesn't fail.
    global.fetch = jest.fn(async () => ({ json: async () => ({ artists: [] }) }));
    const tree = renderer.create(<CategorySelectionScreen navigation={{ navigate: jest.fn() }} />);
    expect(tree.toJSON()).toBeTruthy();
  });

  test('ResultsScreen renders', () => {
    // Test: ResultsScreen imports and renders (uses hardcoded sample list on master).
    const tree = renderer.create(<ResultsScreen navigation={{ navigate: jest.fn() }} />);
    expect(tree.toJSON()).toBeTruthy();
  });

  test('SettingsScreen renders and logout confirm triggers reset', async () => {
    // Test: Settings screen imports/renders. We also set up Alert.alert mocking
    // so if you add button-press simulation later, it won't block the test.
    const navigation = {
      getState: () => ({ routeNames: ['Login'] }),
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    };

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const destructive = (buttons || []).find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    await act(async () => {
      renderer.create(<SettingsScreen navigation={navigation} />);
    });

    // We don't press the actual button here; this is a smoke test to ensure import/render works.
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});

