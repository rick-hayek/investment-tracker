import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface PrivacyShieldProps {
  visible: boolean;
}

export const PrivacyShield: React.FC<PrivacyShieldProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🛡️</Text>
        </View>
        <Text style={styles.title}>隐私保护中</Text>
        <Text style={styles.subtitle}>已阻断后台多任务截屏与数据窥探</Text>
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
