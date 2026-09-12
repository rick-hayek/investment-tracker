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

export interface AssetListProps {
  holdings: AssetHolding[];
  currency: CurrencyType;
  refreshing: boolean;
  onRefresh: () => void;
  onPressAsset: (holding: AssetHolding) => void;
  onPressAdd: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export const AssetList: React.FC<AssetListProps> = ({
  holdings,
  currency,
  refreshing,
  onRefresh,
  onPressAsset,
  onPressAdd,
  ListHeaderComponent,
}) => {
  const renderItem = ({ item }: { item: AssetHolding }) => {
    const meta = KNOWN_ASSETS[item.symbol];
    const iconBg = meta ? meta.color : '#3B82F6';
    const isHoldingPositive = item.unrealizedPnL >= 0;

    return (
      <TouchableOpacity
        style={styles.assetCard}
        onPress={() => onPressAsset(item)}
        activeOpacity={0.7}
      >
        <View style={styles.assetLeft}>
          <View style={[styles.coinIcon, { backgroundColor: iconBg }]}>
            <Text
              style={[
                styles.coinIconText,
                (item.symbol === 'SOL' || item.symbol === 'BNB') && { color: '#090D16' },
              ]}
            >
              {item.symbol.slice(0, 1)}
            </Text>
          </View>
          <View>
            <View style={styles.assetTitleRow}>
              <Text style={styles.assetName}>{item.name}</Text>
              {item.platform && (
                <View style={styles.platformBadge}>
                  <Text style={styles.platformBadgeText}>{item.platform}</Text>
                </View>
              )}
            </View>
            <Text style={styles.assetSub}>
              {item.totalQuantity} {item.symbol} • {formatCurrencyValue(item.currentPrice, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.assetRight}>
          <Text style={styles.assetValue}>
            {formatCurrencyValue(item.marketValue, currency)}
          </Text>
          <Text style={isHoldingPositive ? styles.pnlGreen : styles.pnlRed}>
            {isHoldingPositive ? '+' : ''}
            {item.unrealizedPnLPercent.toFixed(1)}% ({isHoldingPositive ? '+$' : '-$'}
            {Math.abs(item.unrealizedPnL).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })})
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无持仓资产记录，点击上方「＋」开始记账！</Text>
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
  assetCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  platformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pnlGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pnlRed: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
