jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
}));

jest.mock('expo-auth-session', () => {
  const actual = jest.requireActual('expo-auth-session');
  return {
    ...actual,
    makeRedirectUri: jest.fn(() => 'exp://redirect'),
    useAuthRequest: jest.fn(() => [{ codeVerifier: 'verifier' }, null, jest.fn()]),
    exchangeCodeAsync: jest.fn(async () => ({
      accessToken: 'access',
      refreshToken: 'refresh',
    })),
  };
});

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { hostUri: '127.0.0.1:19000' }
  }
}));

// Ignore animated warnings/noise in tests.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');


