import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Header } from '../components/Header';
import { ScreenContainer } from '../components/ScreenContainer';
import { VibeCard, PlaylistCard, SongRow, StatCard, SettingItem } from '../components/Cards';

describe('components (cover exported functions)', () => {
  test('Header renders title and actions', () => {
    const { getByText } = render(
      <Header title="Title" leftAction={<Text>Left</Text>} rightAction={<Text>Right</Text>} />
    );
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Left')).toBeTruthy();
    expect(getByText('Right')).toBeTruthy();
  });

  test('ScreenContainer renders children', () => {
    const { getByText } = render(
      <ScreenContainer>
        <Text>Child</Text>
      </ScreenContainer>
    );
    expect(getByText('Child')).toBeTruthy();
  });

  test('SettingItem calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingItem icon={<Text>I</Text>} label="Sync Songs" onPress={onPress} />
    );
    fireEvent.press(getByText('Sync Songs'));
    expect(onPress).toHaveBeenCalled();
  });

  test('StatCard renders label/value', () => {
    const { getByText } = render(<StatCard icon={<Text>*</Text>} label="Liked" value="10" />);
    expect(getByText('Liked')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
  });

  test('VibeCard renders and calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <VibeCard label="Chill" image="https://example.com/x.png" isSelected={false} onPress={onPress} />
    );
    fireEvent.press(getByText('Chill'));
    expect(onPress).toHaveBeenCalled();
  });

  test('PlaylistCard renders and calls onPress', () => {
    const onPress = jest.fn();
    const playlist = { name: 'Mix', coverImage: 'https://example.com/c.png', songs: [{}, {}] };
    const { getByText } = render(<PlaylistCard playlist={playlist} onPress={onPress} index={0} />);
    fireEvent.press(getByText('Mix'));
    expect(onPress).toHaveBeenCalled();
  });

  test('SongRow renders song info', () => {
    const song = { title: 'Song', artist: 'Artist', albumArt: 'https://example.com/a.png', duration: '3:00' };
    const { getByText } = render(<SongRow song={song} index={0} />);
    expect(getByText('Song')).toBeTruthy();
    expect(getByText('Artist')).toBeTruthy();
    expect(getByText('3:00')).toBeTruthy();
  });
});

