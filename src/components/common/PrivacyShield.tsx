import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LanguageType, t } from '../../i18n';
import { LockIcon } from './Icons';

interface PrivacyShieldProps {
  visible: boolean;
  language?: LanguageType;
}

export const PrivacyShield: React.FC<PrivacyShieldProps> = ({ visible, language = 'zh' }) => {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <LockIcon size={32} color="#38BDF8" />
        </View>
        <Text style={styles.title}>{t('privacy.shieldTitle', language)}</Text>
        <Text style={styles.subtitle}>{t('privacy.shieldSubtitle', language)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090D16',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
