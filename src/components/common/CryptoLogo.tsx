import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BtcLogo, EthLogo, SolLogo } from './Icons';
import { KNOWN_ASSETS, extractBaseSymbol } from '../../services/symbolMapper';

export interface CryptoLogoProps {
  symbol: string;
  iconUrl?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const CryptoLogo: React.FC<CryptoLogoProps> = ({
  symbol,
  iconUrl,
  size = 32,
  style,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const baseSymbol = extractBaseSymbol(symbol).toUpperCase();

  // 1. 优先使用内置高清矢量 SVG
  if (baseSymbol === 'BTC') {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <BtcLogo size={size} />
      </View>
    );
  }
  if (baseSymbol === 'ETH') {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <EthLogo size={size} />
      </View>
    );
  }
  if (baseSymbol === 'SOL') {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <SolLogo size={size} />
      </View>
    );
  }

  // 2. 远端图标 (优先使用已解析的 iconUrl，若未提供也可自动探测 CoinCap 官方高清路径)
  const targetUri =
    iconUrl || `https://assets.coincap.io/assets/icons/${baseSymbol.toLowerCase()}@2x.png`;

  if (targetUri && !imageFailed) {
    return (
      <View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: targetUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  // 3. 兜底优雅单字母圆圈
  const meta = KNOWN_ASSETS[baseSymbol];
  const bgColor = meta ? meta.color : '#3B82F6';
  const displayText = baseSymbol.slice(0, 1);

  return (
    <View
      style={[
        styles.fallbackCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize: Math.max(12, Math.round(size * 0.44)) }]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
