module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^expo-file-system(.*)$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-sharing(.*)$': '<rootDir>/__mocks__/expo-sharing.js',
    '^expo-print(.*)$': '<rootDir>/__mocks__/expo-print.js',
    '^expo-secure-store(.*)$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^react-native-url-polyfill(.*)$': '<rootDir>/__mocks__/react-native-url-polyfill.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          rootDir: '.',
          jsx: 'react',
          moduleResolution: 'node',
          ignoreDeprecations: '6.0',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          types: ['jest', 'node'],
          isolatedModules: true,
        },
      },
    ],
  },
};
