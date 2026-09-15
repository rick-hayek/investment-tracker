import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Vibration,
  Platform as RNPlatform,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { PlatformType, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { ExchangeService, defaultExchangeService } from '../../services/exchangeService';
import {
  TimeframeType,
  ChartDataPoint,
  ComputedPoint,
  generateSimulatedHistory,
  computeCoordinates,
  findNearestPoint,
} from './chartUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32 - 40; // 考虑卡片与内外间距
const CHART_HEIGHT = 160;

const TIMEFRAMES: TimeframeType[] = ['24H', '1W', '1M', '1Y', 'ALL'];

export interface InteractiveChartProps {
  symbol: string;
  platform: PlatformType;
  currentPrice: number;
  averageCost?: number;
  change24hPercent?: number;
  currency: CurrencyType;
  exchangeService?: ExchangeService;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  symbol,
  platform,
  currentPrice,
  averageCost = 0,
  change24hPercent = 0,
  currency,
  exchangeService = defaultExchangeService,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('24H');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activePoint, setActivePoint] = useState<ComputedPoint | null>(null);
  const lastHapticPointIndex = useRef<number>(-1);

  // 拉取分时数据
  const loadChartData = useCallback(async () => {
    try {
      if (exchangeService.fetchHistoricalChart) {
        const rawPoints = await exchangeService.fetchHistoricalChart(platform, symbol, selectedTimeframe);
        if (rawPoints && rawPoints.length >= 2) {
          setChartData(rawPoints);
          return;
        }
      } else {
        const adapter = exchangeService.getAdapter(platform);
        if (adapter.fetchHistoricalChart) {
          const rawPoints = await adapter.fetchHistoricalChart(symbol, selectedTimeframe);
          if (rawPoints && rawPoints.length >= 2) {
            setChartData(rawPoints);
            return;
          }
        }
      }
      // 兜底仿真数据
      const fallback = generateSimulatedHistory(currentPrice, selectedTimeframe, change24hPercent);
      setChartData(fallback);
    } catch {
      // 接口失败兜底
      const fallback = generateSimulatedHistory(currentPrice, selectedTimeframe, change24hPercent);
      setChartData(fallback);
    }
  }, [exchangeService, platform, symbol, selectedTimeframe, currentPrice, change24hPercent]);

  useEffect(() => {
    loadChartData();
    setActivePoint(null);
  }, [loadChartData]);

  // 计算几何路径与点
  const { computedPoints, linePath, areaPath } = useMemo(() => {
    return computeCoordinates(chartData, CHART_WIDTH, CHART_HEIGHT);
  }, [chartData]);

  const isPositive = useMemo(() => {
    if (chartData.length < 2) return true;
    return chartData[chartData.length - 1].price >= chartData[0].price;
  }, [chartData]);

  const strokeColor = isPositive ? '#10B981' : '#EF4444';

  // 触摸手势响应器 (Touch Scrubbing)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const nearest = findNearestPoint(computedPoints, touchX);
        if (nearest) {
          setActivePoint(nearest);
        }
      },
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const nearest = findNearestPoint(computedPoints, touchX);
        if (nearest) {
          setActivePoint(nearest);
          const idx = computedPoints.indexOf(nearest);
          if (idx !== lastHapticPointIndex.current) {
            lastHapticPointIndex.current = idx;
            // 触发轻柔振动反馈 (Haptic Feedback)
            try {
              if (RNPlatform.OS !== 'web') {
                Vibration.vibrate(8);
              }
            } catch {
              // 忽略不支持设备
            }
          }
        }
      },
      onPanResponderRelease: () => {
        // 放手后保留高亮或可点击重置
      },
    })
  ).current;

  // 当前检查的价格与未实现收益率
  const inspectPrice = activePoint ? activePoint.price : currentPrice;
  const inspectTimeStr = activePoint
    ? new Date(activePoint.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${selectedTimeframe} 实时行情`;

  // 相比持仓均价的收益率
  const pnlPercentVsCost = averageCost > 0
    ? (((inspectPrice - averageCost) / averageCost) * 100).toFixed(1)
    : null;

  return (
    <View style={styles.container}>
      {/* 周期切换选项卡 */}
      <View style={styles.timeframeBar}>
        {TIMEFRAMES.map((tf) => {
          const isSelected = selectedTimeframe === tf;
          return (
            <TouchableOpacity
              key={tf}
              style={[styles.tfTab, isSelected && styles.tfTabActive]}
              onPress={() => setSelectedTimeframe(tf)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tfTabText, isSelected && styles.tfTabTextActive]}>
                {tf}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 十字光标动态探针卡片 */}
      <View style={styles.inspectHeader}>
        <View>
          <Text style={styles.inspectPriceText}>
            {formatCurrencyValue(inspectPrice, currency)}
          </Text>
          <Text style={styles.inspectTimeText}>
            {inspectTimeStr} {activePoint ? '● 游标定位' : ''}
          </Text>
        </View>

        {pnlPercentVsCost !== null && (
          <View style={styles.inspectPnlBadge}>
            <Text style={styles.inspectPnlText}>
              {parseFloat(pnlPercentVsCost) >= 0 ? '+' : ''}
              {pnlPercentVsCost}% (相比均价)
            </Text>
          </View>
        )}
      </View>

      {/* SVG 折线走势与十字光标 */}
      <View style={styles.svgWrapper} {...panResponder.panHandlers}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <Defs>
            <LinearGradient id="interactive_chart_grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* 渐变底面 */}
          {areaPath ? <Path d={areaPath} fill="url(#interactive_chart_grad)" /> : null}

          {/* 曲线 */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* 十字光标 (Crosshair / Touch Scrubber) */}
          {activePoint && (
            <>
              {/* 纵向指示虚线 */}
              <Line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={CHART_HEIGHT}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth={1}
                strokeDasharray="4, 4"
              />

              {/* 焦点光环与实心圆 */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={9}
                fill="rgba(56, 189, 248, 0.25)"
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4.5}
                fill="#FFFFFF"
                stroke="#38BDF8"
                strokeWidth={2}
              />
            </>
          )}
        </Svg>
      </View>

      <Text style={styles.scrubHintText}>💡 长按手指在图表中左右滑动，可滑动十字光标查看任意时段点位</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  timeframeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tfTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  tfTabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  tfTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tfTabTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  inspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    minHeight: 44,
  },
  inspectPriceText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  inspectTimeText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  inspectPnlBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inspectPnlText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  scrubHintText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
