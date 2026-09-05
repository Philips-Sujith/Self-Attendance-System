// Jest mocks for Expo and React Native native modules
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/documents/SAS_Attendance.pdf',
    numberOfPages: 1,
  }),
  printAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));
