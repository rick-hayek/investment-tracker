module.exports = {
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: '/mock/file.csv', name: 'file.csv' }],
  }),
};
