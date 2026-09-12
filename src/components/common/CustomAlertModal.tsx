import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { AlertTriangleIcon, CheckCircleIcon, TrashCanIcon } from './Icons';

export type AlertType = 'danger' | 'warning' | 'success' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  type = 'warning',
  title,
  message,
  buttons,
  onClose,
}) => {
  const activeButtons: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: '好的', style: 'default' }];

  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <View style={[styles.iconCircle, styles.iconCircleDanger]}>
            <AlertTriangleIcon size={26} color="#EF4444" />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconCircle, styles.iconCircleWarning]}>
            <AlertTriangleIcon size={26} color="#F59E0B" />
          </View>
        );
      case 'success':
        return (
          <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
            <CheckCircleIcon size={26} color="#10B981" />
          </View>
        );
      case 'info':
      default:
        return (
          <View style={[styles.iconCircle, styles.iconCircleInfo]}>
            <AlertTriangleIcon size={26} color="#38BDF8" />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* 顶部图标 */}
              {renderIcon()}

              {/* 标题 */}
              <Text style={styles.title}>{title}</Text>

              {/* 详细描述 */}
              <Text style={styles.message}>{message}</Text>

              {/* 操作按钮区 */}
              <View
                style={[
                  styles.buttonRow,
                  activeButtons.length > 2 && styles.buttonColumn,
                ]}
              >
                {activeButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        activeButtons.length <= 2 && styles.buttonFlex,
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                        !isCancel && !isDestructive && styles.primaryButton,
                      ]}
                      onPress={() => {
                        onClose();
                        btn.onPress?.();
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.cancelButtonText,
                          isDestructive && styles.destructiveButtonText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121A2A',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  iconCircleDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  iconCircleWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  iconCircleInfo: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
