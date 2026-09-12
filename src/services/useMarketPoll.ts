import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface UseMarketPollOptions {
  intervalMs?: number; // 轮询间隔，默认 15000 ms (15秒)
  enabled?: boolean; // 是否启用轮询
}

/**
 * 前台智能节流轮询 Hook
 * 当 App 位于前台时，每隔 intervalMs 触发一次刷新；当 App 退到后台或休眠时，自动暂停定时器以节省功耗和流量。
 */
export function useMarketPoll(
  onPoll: () => Promise<void> | void,
  options: UseMarketPollOptions = {}
) {
  const { intervalMs = 15000, enabled = true } = options;
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const savedCallback = useRef(onPoll);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    savedCallback.current = onPoll;
  }, [onPoll]);

  const triggerPoll = useCallback(async () => {
    try {
      setIsPolling(true);
      await savedCallback.current();
    } catch (err) {
      console.warn('Market poll error:', err);
    } finally {
      setIsPolling(false);
    }
  }, []);

  // 监听 App 前后台切换
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 轮询调度逻辑
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const isActive = appState === 'active';

    if (isActive) {
      // 立即触发一次初次刷新
      triggerPoll();

      // 开启前台节流定时器
      timerRef.current = setInterval(() => {
        triggerPoll();
      }, intervalMs);
    } else {
      // 退到后台，清理定时器休眠
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [appState, enabled, intervalMs, triggerPoll]);

  return {
    appState,
    isPolling,
    triggerManualRefresh: triggerPoll,
  };
}
