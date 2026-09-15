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

import { CryptoLogo } from '../common/CryptoLogo';
import { StarIcon } from '../common/Icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

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
  ListFooterComponent?: React.ReactElement;
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
  ListFooterComponent,
}) => {
  const { colors, isDark } = useTheme();

  const renderItem = ({ item }: { item: AssetHolding }) => {
    const isHoldingPositive = item.unrealizedPnL >= 0;

    return (
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => onPressAsset(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark ? ['#1E2638', '#0F1522'] : ['#FFFFFF', '#F8FAFC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.7 }}
          style={[styles.assetCard, { borderColor: colors.cardBorder }]}
        >
          <View style={styles.assetLeft}>
            <CryptoLogo symbol={item.symbol} iconUrl={item.iconUrl} size={32} />
            <View style={styles.nameContainer}>
              <View style={styles.assetTitleRow}>
                <Text style={[styles.assetName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.platform && (
                  <View style={[styles.platformBadge, { backgroundColor: colors.accentLight }]}>
                    <Text style={[styles.platformBadgeText, { color: colors.accent }]}>{item.platform}</Text>
                  </View>
                )}
                {item.isFavorite && (
                  <StarIcon size={12} color="#FBBF24" filled />
                )}
              </View>
              <Text style={[styles.assetSub, { color: colors.textSecondary }]}>
                {item.symbol} • {privacyMode ? '••••' : item.totalQuantity}
              </Text>
            </View>
          </View>

          <View style={styles.assetRight}>
            <Text style={[styles.assetValue, { color: colors.textPrimary }]}>
              {formatCurrencyValue(item.marketValue, currency, { privacyMode })}
            </Text>
            <View style={styles.rightBottomRow}>
              <Text style={isHoldingPositive ? [styles.pnlGreen, { color: colors.gain }] : [styles.pnlRed, { color: colors.loss }]}>
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
    <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('holdings.emptyText', language)}</Text>
    </View>
  );

  return (
    <FlatList
      data={holdings}
      keyExtractor={(item) => item.assetId}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
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
    borderRadius: 15,
  },
  assetCard: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 15,
    paddingVertical: 8.5,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  platformBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
  },
  platformBadgeText: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  assetSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 1,
  },
  nameContainer: {
    marginLeft: 1,
  },
  assetRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1.5,
  },
  assetValue: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  pnlGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  pnlRed: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
