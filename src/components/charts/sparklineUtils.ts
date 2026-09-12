/**
 * 将数据点转化为平滑的三阶贝塞尔曲线 SVG 路径
 */
export function generateSparklinePaths(
  data: number[],
  width: number,
  height: number,
  padding: number = 6
): { linePath: string; areaPath: string } {
  if (!data || data.length < 2) {
    // 默认平滑示意走势曲线 (正向)
    const fallbackLine = `M 0 ${height * 0.75} Q ${width * 0.25} ${height * 0.8}, ${width * 0.45} ${height * 0.5} T ${width * 0.75} ${height * 0.3} T ${width} ${height * 0.15}`;
    const fallbackArea = `${fallbackLine} L ${width} ${height} L 0 ${height} Z`;
    return { linePath: fallbackLine, areaPath: fallbackArea };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const innerHeight = height - padding * 2;
  const stepX = width / (data.length - 1);

  // 计算各点的 (x, y) 坐标
  const points = data.map((val, idx) => {
    const x = idx * stepX;
    // 数值越大，y 坐标越靠近顶部 0
    const normalizedY = 1 - (val - min) / range;
    const y = padding + normalizedY * innerHeight;
    return { x, y };
  });

  // 构建平滑贝塞尔曲线
  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    // 使用平滑控制点
    linePath += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const areaPath = `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

  return { linePath, areaPath };
}
