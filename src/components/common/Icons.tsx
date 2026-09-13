import React from 'react';
import Svg, { Path, Circle, Rect, G, Line, Polyline } from 'react-native-svg';
import { PlatformType } from '../../domain/types';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * 极简返回尖角线条图标 (<)
 */
export const ChevronLeftIcon: React.FC<IconProps> = ({
  size = 22,
  color = '#F8FAFC',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 19L8 12L15 5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简前行尖角线条图标 (>)
 */
export const ChevronRightIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#64748B',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 5L16 12L9 19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简下行尖角线条图标 (v)
 */
export const ChevronDownIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#64748B',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简三道杠菜单线条图标 (Menu / Hamburger)
 */
export const MenuIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#F8FAFC',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6H20M4 12H20M4 18H20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简编辑铅笔线条图标 (Edit)
 */
export const EditPencilIcon: React.FC<IconProps> = ({
  size = 15,
  color = '#F8FAFC',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 6L18 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简货币美元线条图标 ($)
 */
export const BaseCurrencyIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path
      d="M17 5H9.5C7.567 5 6 6.567 6 8.5C6 10.433 7.567 12 9.5 12H14.5C16.433 12 18 13.567 18 15.5C18 17.433 16.433 19 14.5 19H6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简圆角挂锁线条图标 (Lock / Privacy Mode)
 */
export const LockIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="4"
      y="10"
      width="16"
      height="11"
      rx="3"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Circle cx="12" cy="15.5" r="1.2" fill={color} />
  </Svg>
);

/**
 * 极简新月轮廓线条图标 (Moon / Theme)
 */
export const MoonIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简太阳线条图标 (Sun / Light Mode)
 */
export const SunIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简屏幕设备线条图标 (System / Auto Mode)
 */
export const SystemMonitorIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简出库托盘 + 向下箭头图标 (Export CSV)
 */
export const ExportCsvIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="8 10 12 14 16 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1="12"
      y1="3"
      x2="12"
      y2="14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * 极简导入导出双向数据传输图标 (Import & Export)
 */
export const ImportExportIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 4V18M7 18L3 14M7 18L11 14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 20V6M17 6L13 10M17 6L21 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简云朵线条图标 (Cloud Backup)
 */
export const CloudBackupIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 10H17.26C16.89 6.64 14.07 4 10.63 4C7.94 4 5.6 5.62 4.67 8.04C2.56 8.57 1 10.48 1 12.77C1 15.42 3.16 17.58 5.81 17.58H18C20.21 17.58 22 15.79 22 13.58C22 11.37 20.21 10 18 10Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简房屋线条图标 (Home)
 */
export const HomeIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#38BDF8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简齿轮线条图标 (Settings Gear)
 */
export const SettingsGearIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简通知铃铛线条图标 (Bell)
 */
export const BellIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#F8FAFC',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21C13.55 21.31 13.3 21.56 12.99 21.73C12.69 21.9 12.35 22 12 22C11.65 22 11.31 21.9 11.01 21.73C10.7 21.56 10.45 21.31 10.27 21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简细线交叉叉号图标 (Close ✕)
 */
export const CloseCrossIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#F8FAFC',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简眼睛轮廓图标 (Eye)
 */
export const EyeIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

/**
 * 极简斜杠闭眼防窥图标 (Eye Off)
 */
export const EyeOffIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.82 16.5M1 1L23 23"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简圆形加号操作图标 ((+) Deposit / Buy)
 */
export const DepositPlusIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简圆形上箭头操作图标 ((↑) Withdraw / Sell)
 */
export const WithdrawArrowIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Polyline
      points="9 11 12 8 15 11"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简圆形柱状图分析图标 ((📊) Analytics)
 */
export const AnalyticsChartIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="9" y1="16" x2="9" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="16" x2="12" y2="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="15" y1="16" x2="15" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简搜索放大镜线条图标 (Search)
 */
export const SearchIcon: React.FC<IconProps> = ({
  size = 18,
  color = '#64748B',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

/**
 * 极简五角星图标 (Star)
 */
export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 20,
  color = '#F8FAFC',
  filled = false,
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简头像剪影图标 (User Avatar Silhouette)
 */
export const UserAvatarIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * 四合一交易所微图标矩阵 (Connected Exchanges 2x2 cluster)
 */
export const ExchangeMatrixIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* OKX 风格黑底白点 */}
    <Rect x="2" y="2" width="9" height="9" rx="2.5" fill="#111111" stroke="#334155" strokeWidth="1" />
    <Circle cx="4.5" cy="4.5" r="1" fill="#FFFFFF" />
    <Circle cx="8.5" cy="4.5" r="1" fill="#FFFFFF" />
    <Circle cx="4.5" cy="8.5" r="1" fill="#FFFFFF" />
    <Circle cx="8.5" cy="8.5" r="1" fill="#FFFFFF" />

    {/* Binance 风格金黄菱形 */}
    <Rect x="13" y="2" width="9" height="9" rx="2.5" fill="#181A20" stroke="#334155" strokeWidth="1" />
    <Path d="M17.5 4.5L19.5 6.5L17.5 8.5L15.5 6.5Z" fill="#F0B90B" />

    {/* Coinbase 蓝底圆环 */}
    <Rect x="2" y="13" width="9" height="9" rx="2.5" fill="#0052FF" />
    <Circle cx="6.5" cy="17.5" r="2" fill="#FFFFFF" />

    {/* CoinGecko 绿色 */}
    <Rect x="13" y="13" width="9" height="9" rx="2.5" fill="#8DC63F" />
    <Circle cx="17.5" cy="17.5" r="2.2" fill="#FFFFFF" />
  </Svg>
);

/**
 * 比特币 (BTC) 矢量 Logo
 */
export const BtcLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#F7931A" />
    <Path
      d="M21.5 13.5C21.8 11.5 20.3 10.3 18.5 9.8L19 7.8L17.8 7.5L17.3 9.4C17 9.3 16.6 9.2 16.3 9.1L16.8 7.2L15.6 6.9L15.1 8.9C14.8 8.8 14.6 8.8 14.3 8.7L12.6 8.3L12.3 9.7C12.3 9.7 13.2 9.9 13.2 9.9C13.7 10 13.8 10.4 13.7 10.7L12.4 15.9C12.4 16 12.3 16.1 12.1 16.2C12.1 16.2 11.2 16 11.2 16L10.7 17.5L12.3 17.9C12.6 18 12.9 18.1 13.2 18.2L12.7 20.2L13.9 20.5L14.4 18.5C14.7 18.6 15 18.7 15.3 18.7L14.8 20.7L16 21L16.5 19C18.6 19.4 20.2 19 20.9 17.3C21.5 15.9 21 14.9 20 14.3C20.7 13.8 21.2 13 21.5 13.5ZM18.7 16.5C18.3 18.1 15.8 17.2 14.8 17L15.5 14.2C16.5 14.4 19.1 14.8 18.7 16.5ZM19.2 12.7C18.8 14.1 16.7 13.3 15.9 13.1L16.5 10.6C17.3 10.8 19.6 11.2 19.2 12.7Z"
      fill="#FFFFFF"
    />
  </Svg>
);

/**
 * 以太坊 (ETH) 矢量 Logo
 */
export const EthLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#252A36" stroke="#374151" strokeWidth="1" />
    <Path d="M16 6L9.5 16.8L16 20.8L22.5 16.8L16 6Z" fill="#C0C4CC" />
    <Path d="M16 6L16 20.8L22.5 16.8L16 6Z" fill="#FFFFFF" />
    <Path d="M16 22L9.5 18L16 26L22.5 18L16 22Z" fill="#C0C4CC" />
    <Path d="M16 22L16 26L22.5 18L16 22Z" fill="#FFFFFF" />
  </Svg>
);

/**
 * 索拉纳 (SOL) 矢量 Logo
 */
export const SolLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#13151D" stroke="#374151" strokeWidth="1" />
    <Path
      d="M9 11L11.5 8.5H23L20.5 11H9Z"
      fill="#00FFA3"
    />
    <Path
      d="M9 16.5L11.5 14H23L20.5 16.5H9Z"
      fill="#03E1FF"
    />
    <Path
      d="M9 22L11.5 19.5H23L20.5 22H9Z"
      fill="#DC1FFF"
    />
  </Svg>
);

/**
 * 泰达币 (USDT) 矢量 Logo
 */
export const UsdtLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#26A17B" />
    <Path
      d="M17.8 12.8V10.5H23V8H9V10.5H14.2V12.8C10.5 13 7.8 13.8 7.8 14.8C7.8 15.8 10.5 16.6 14.2 16.8V24H17.8V16.8C21.5 16.6 24.2 15.8 24.2 14.8C24.2 13.8 21.5 13 17.8 12.8ZM16 15.6C12.4 15.6 10.3 15 10.3 14.8C10.3 14.6 12.4 14 16 14C19.6 14 21.7 14.6 21.7 14.8C21.7 15 19.6 15.6 16 15.6Z"
      fill="#FFFFFF"
    />
  </Svg>
);

/**
 * USD Coin (USDC) 矢量 Logo
 */
export const UsdcLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#2775CA" />
    <Path
      d="M16 6C10.5 6 6 10.5 6 16C6 21.5 10.5 26 16 26C21.5 26 26 21.5 26 16C26 10.5 21.5 6 16 6ZM16 7.8C20.5 7.8 24.2 11.5 24.2 16C24.2 20.5 20.5 24.2 16 24.2C11.5 24.2 7.8 20.5 7.8 16C7.8 11.5 11.5 7.8 16 7.8ZM15.1 10.8V12.2C13.2 12.5 12.2 13.6 12.2 14.9C12.2 17.2 14.8 17.5 16.3 17.9C17.4 18.2 18 18.6 18 19.3C18 20.1 17.2 20.7 16 20.7C14.5 20.7 13.6 20.1 13.3 19.1H11.7C12 20.8 13.3 21.8 15.1 22.1V23.5H16.9V22.1C18.8 21.8 20 20.7 20 19.3C20 16.9 17.4 16.5 15.9 16.2C14.8 15.9 14.1 15.5 14.1 14.8C14.1 14.1 14.8 13.5 16 13.5C17.3 13.5 18 14 18.3 14.9H19.9C19.6 13.3 18.5 12.4 16.9 12.2V10.8H15.1Z"
      fill="#FFFFFF"
    />
  </Svg>
);

/**
 * 极简地球/多语言矢量线条图标 (Globe)
 */
export const GlobeIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M3.6 9H20.4M3.6 15H20.4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M12 3C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简垃圾桶/清空线条图标 (Trash / Delete / Clear)
 */
export const TrashCanIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#EF4444',
  strokeWidth = 1.8,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简警告感叹号三角线条图标 (Warning / Alert Triangle)
 */
export const AlertTriangleIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EF4444',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill={color} />
  </Svg>
);

/**
 * 极简成功对勾圆圈线条图标 (Success Check Circle)
 */
export const CheckCircleIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#10B981',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M8.5 12.5L11 15L15.5 9.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 极简投资上升趋势 Logo 图标 (Investment Growth / Trend Arrow)
 */
export const AppLogoIcon: React.FC<IconProps> = ({
  size = 22,
  color = '#38BDF8',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 17L8.5 11.5L12.5 15.5L21 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15 7H21V13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * OKX 交易所官方矢量 Logo (黑底5方块矩阵)
 */
export const OkxLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Rect width="32" height="32" rx="16" fill="#000000" />
    <Rect x="8" y="8" width="5" height="5" rx="1.2" fill="#FFFFFF" />
    <Rect x="19" y="8" width="5" height="5" rx="1.2" fill="#FFFFFF" />
    <Rect x="13.5" y="13.5" width="5" height="5" rx="1.2" fill="#FFFFFF" />
    <Rect x="8" y="19" width="5" height="5" rx="1.2" fill="#FFFFFF" />
    <Rect x="19" y="19" width="5" height="5" rx="1.2" fill="#FFFFFF" />
  </Svg>
);

/**
 * 币安 (Binance) 交易所官方矢量 Logo (经典品牌黄菱形矩阵)
 */
export const BinanceLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#F0B90B" />
    <Path d="M16 7.5L19.5 11L17.3 13.2L16 11.9L14.7 13.2L12.5 11L16 7.5Z" fill="#181A20" />
    <Path d="M10.2 13.3L12.4 15.5L10.2 17.7L8 15.5L10.2 13.3Z" fill="#181A20" />
    <Path d="M21.8 13.3L24 15.5L21.8 17.7L19.6 15.5L21.8 13.3Z" fill="#181A20" />
    <Path d="M16 19.1L17.3 17.8L19.5 20L16 23.5L12.5 20L14.7 17.8L16 19.1Z" fill="#181A20" />
    <Path d="M16 13.6L18.2 15.8L16 18L13.8 15.8L16 13.6Z" fill="#181A20" />
  </Svg>
);

/**
 * Coinbase 交易所官方矢量 Logo (经典蓝底 C 字圆环)
 */
export const CoinbaseLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#0052FF" />
    <Path
      d="M16 7.5C11.3 7.5 7.5 11.3 7.5 16C7.5 20.7 11.3 24.5 16 24.5C20.2 24.5 23.8 21.4 24.4 17.3H18.7C18.2 19 16.6 20.2 14.8 19.9C13 19.5 11.7 17.9 11.8 16C11.9 14.1 13.4 12.5 15.3 12.5C16.8 12.5 18.1 13.4 18.6 14.7H24.3C23.6 10.5 20.1 7.5 16 7.5Z"
      fill="#FFFFFF"
    />
  </Svg>
);

/**
 * CoinGecko 平台官方矢量 Logo (草绿底壁虎徽标)
 */
export const CoinGeckoLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill="#8DC63F" />
    <Path
      d="M15.5 8C11 8 8 11.5 8 16C8 20.5 11.5 24 16.5 24C21.5 24 24.5 21 24.5 17C24.5 15 23 13.5 21.5 13.5C20.5 13.5 19.8 14 19.2 14.5C18.5 12 16.8 9.5 15.5 8Z"
      fill="#FFFFFF"
    />
    <Circle cx="13" cy="13.5" r="2.2" fill="#181A20" />
    <Circle cx="13.6" cy="12.9" r="0.8" fill="#FFFFFF" />
    <Path d="M11 18C12.5 19.5 15.5 19.5 17 18" stroke="#181A20" strokeWidth="1.2" strokeLinecap="round" />
  </Svg>
);

/**
 * 统一根据交易所平台返回官方矢量 Logo
 */
export const renderPlatformLogo = (platform: PlatformType, size = 32) => {
  switch (platform) {
    case 'OKX':
      return <OkxLogo size={size} />;
    case 'Binance':
      return <BinanceLogo size={size} />;
    case 'Coinbase':
      return <CoinbaseLogo size={size} />;
    case 'CoinGecko':
      return <CoinGeckoLogo size={size} />;
    default:
      return <OkxLogo size={size} />;
  }
};


