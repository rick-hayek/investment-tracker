const React = require('react');
const { View } = require('react-native');

const LinearGradient = ({ children, style, ...props }) => {
  return React.createElement(View, { style, ...props }, children);
};

module.exports = {
  LinearGradient,
};
