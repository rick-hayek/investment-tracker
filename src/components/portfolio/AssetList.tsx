import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { AssetHolding, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { KNOWN_ASSETS } from '../../services/symbolMapper';
import { LanguageType, t } from '../../i18n';

import { BtcLogo, EthLogo, SolLogo } from '../common/Icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface AssetListProps {
  holdings: AssetHolding[];
  currency: CurrencyType;
  refreshing: boolean;
  privacyMode?: boolean;
  language?: LanguageType;
  onRefresh: () => void;
  onPressAsset: (holding: AssetHolding) => void;
  onPressAdd: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export const AssetList: React.FC<AssetListProps> = ({
  holdings,
  currency,
  refreshing,
  privacyMode = false,
  language = 'zh',
  onRefresh,
  onPressAsset,
  onPressAdd,
  ListHeaderComponent,
}) => {
  const renderLogo = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case 'BTC':
        return <BtcLogo size={34} />;
      case 'ETH':
        return <EthLogo size={34} />;
      case 'SOL':
        return <SolLogo size={34} />;
      default: {
        const meta = KNOWN_ASSETS[symbol];
        const iconBg = meta ? meta.color : '#3B82F6';
        return (
          <View style={[styles.coinIcon, { backgroundColor: iconBg }]}>
            <Text style={styles.coinIconText}>{symbol.slice(0, 1)}</Text>
          </View>
        );
      }
    }
  };

  const renderItem = ({ item }: { item: AssetHolding }) => {
    const isHoldingPositive = item.unrealizedPnL >= 0;

    return (
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => onPressAsset(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#27354B', '#131A28']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.assetCard}
        >
          <View style={styles.assetLeft}>
            {renderLogo(item.symbol)}
            <View style={styles.nameContainer}>
              <View style={styles.assetTitleRow}>
                <Text style={styles.assetName}>{item.name}</Text>
                {item.platform && (
                  <View style={styles.platformBadge}>
                    <Text style={styles.platformBadgeText}>{item.platform}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.assetSub}>
                {item.symbol} • {privacyMode ? '••••' : item.totalQuantity}
              </Text>
            </View>
          </View>

          <View style={styles.assetRight}>
            <Text style={styles.assetValue}>
              {formatCurrencyValue(item.marketValue, currency, { privacyMode })}
            </Text>
            <View style={styles.rightBottomRow}>
              <Text style={isHoldingPositive ? styles.pnlGreen : styles.pnlRed}>
                {privacyMode
                  ? '•••••• (••%)'
                  : `${isHoldingPositive ? '+' : '-'}${formatCurrencyValue(
                      Math.abs(item.unrealizedPnL),
                      currency
                    )} (${isHoldingPositive ? '+' : ''}${item.unrealizedPnLPercent.toFixed(1)}%)`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('holdings.emptyText', language)}</Text>
    </View>
  );

  return (
    <FlatList
      data={holdings}
      keyExtractor={(item) => item.assetId}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38BDF8"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 26, 43, 0.4)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardTouchable: {
    marginBottom: 8,
    borderRadius: 16,
  },
  assetCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  platformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  platformBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  assetSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  nameContainer: {
    marginLeft: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  assetValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pnlGreen: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '600',
  },
  pnlRed: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
