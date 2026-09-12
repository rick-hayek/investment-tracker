module.exports = {
  Share: {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((objs) => objs.ios || objs.default),
  },
  Vibration: {
    vibrate: jest.fn(),
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  },
  StyleSheet: {
    create: (styles) => styles,
    absoluteFillObject: {},
  },
};
