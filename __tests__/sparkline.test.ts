import { generateSparklinePaths } from '../src/components/charts/sparklineUtils';

describe('Sparkline Algorithm (走势微缩图路径生成测试)', () => {
  it('当数据点不足时生成优雅的备用平滑曲线', () => {
    const fallbackEmpty = generateSparklinePaths([], 280, 60);
    expect(fallbackEmpty.linePath).toContain('M 0');
    expect(fallbackEmpty.areaPath).toContain('L 280 60');

    const fallbackSingle = generateSparklinePaths([100], 280, 60);
    expect(fallbackSingle.linePath).toContain('M 0');
  });

  it('根据输入点阵正确生成贝塞尔折线与渐变填充闭合路径', () => {
    const data = [100, 110, 105, 120, 130];
    const { linePath, areaPath } = generateSparklinePaths(data, 200, 50, 5);

    // 路径起点
    expect(linePath.startsWith('M 0.0')).toBe(true);
    // 包含贝塞尔三次平滑曲线控制点
    expect(linePath).toContain('C');
    // 闭合区域包含起点与终点封底
    expect(areaPath.endsWith('L 200.0 50.0 L 0 50.0 Z')).toBe(true);
  });

  it('平稳恒定数据（全相同数值）不发生除以零异常', () => {
    const flatData = [50, 50, 50, 50];
    const { linePath, areaPath } = generateSparklinePaths(flatData, 100, 40);

    expect(linePath).toBeDefined();
    expect(linePath).not.toContain('NaN');
    expect(areaPath).not.toContain('NaN');
  });
});
