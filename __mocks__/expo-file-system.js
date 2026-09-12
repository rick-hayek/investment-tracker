module.exports = {
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/doc/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  EncodingType: {
    UTF8: 'utf8',
  },
};
