import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { generateSparklinePaths } from './sparklineUtils';

export { generateSparklinePaths };

export interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  strokeWidth?: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data = [100, 102, 98, 105, 110, 108, 115, 122],
  width = 280,
  height = 60,
  isPositive = true,
  strokeWidth = 2.5,
  color,
}) => {
  const strokeColor = color || (isPositive ? '#10B981' : '#EF4444');
  const gradientId = `sparkline_grad_${isPositive ? 'pos' : 'neg'}`;

  const { linePath, areaPath } = generateSparklinePaths(data, width, height);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* 区域渐变填充 */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* 走势折线 */}
        <Path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignSelf: 'center',
  },
});
