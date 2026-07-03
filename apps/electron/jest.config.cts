import type { Config } from 'jest';

const config: Config = {
  displayName: 'electron',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', {}],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../../coverage/apps/electron',
  transformIgnorePatterns: [],
};

export default config;
