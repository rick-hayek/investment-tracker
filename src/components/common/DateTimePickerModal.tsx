import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { CalendarIcon, ClockIcon, CloseCrossIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from './Icons';
import { formatCurrentDateTime } from '../../utils/dateUtils';
import { useTheme, ThemePalette } from '../../theme';

export interface DateTimePickerModalProps {
  visible: boolean;
  initialValue?: string; // 格式: "YYYY-MM-DD HH:mm" 或空
  onConfirm: (formattedDateTime: string) => void;
  onClear?: () => void;
  onClose: () => void;
  language?: 'zh' | 'en';
}

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_ZH = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];
const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// 快捷分钟选项
const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  initialValue = '',
  onConfirm,
  onClear,
  onClose,
  language = 'zh',
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const isZh = language === 'zh';

  // 解析初始日期
  const parsedInitial = useMemo(() => {
    if (initialValue && initialValue.trim()) {
      const match = initialValue.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2}))?/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1;
        const d = parseInt(match[3], 10);
        const h = match[4] !== undefined ? parseInt(match[4], 10) : new Date().getHours();
        const min = match[5] !== undefined ? parseInt(match[5], 10) : new Date().getMinutes();
        return { year: y, month: m, day: d, hour: h, minute: min };
      }
    }
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }, [initialValue]);

  // 当前选中状态
  const [selectedYear, setSelectedYear] = useState(parsedInitial.year);
  const [selectedMonth, setSelectedMonth] = useState(parsedInitial.month);
  const [selectedDay, setSelectedDay] = useState(parsedInitial.day);
  const [selectedHour, setSelectedHour] = useState(parsedInitial.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsedInitial.minute);

  // 当前日历视图所在月份
  const [viewYear, setViewYear] = useState(parsedInitial.year);
  const [viewMonth, setViewMonth] = useState(parsedInitial.month);

  // 日期子面板模式：'days' (正常日历) | 'years' (年份选择器) | 'months' (月份选择器)
  const [calendarViewMode, setCalendarViewMode] = useState<'days' | 'years' | 'months'>('days');

  // 当前选中的 Tab: 'date' | 'time'
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');

  // 当弹窗打开时重置状态
  useEffect(() => {
    if (visible) {
      setSelectedYear(parsedInitial.year);
      setSelectedMonth(parsedInitial.month);
      setSelectedDay(parsedInitial.day);
      setSelectedHour(parsedInitial.hour);
      setSelectedMinute(parsedInitial.minute);
      setViewYear(parsedInitial.year);
      setViewMonth(parsedInitial.month);
      setActiveTab('date');
      setCalendarViewMode('days');
    }
  }, [visible, parsedInitial]);

  // 今天的时间对象，用于高亮今天
  const today = useMemo(() => new Date(), [visible]);
  const isCurrentMonthToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth;

  // 可选年份列表 (从 2010 到 当前年份+10)
  const yearList = useMemo(() => {
    const currentYear = today.getFullYear();
    const start = Math.min(2010, currentYear - 15);
    const end = Math.max(2035, currentYear + 10);
    const list: number[] = [];
    for (let y = start; y <= end; y++) {
      list.push(y);
    }
    return list;
  }, [today]);

  // 快捷年份标签 (今年及过去5年)
  const quickYearPresets = useMemo(() => {
    const cur = today.getFullYear();
    return [cur, cur - 1, cur - 2, cur - 3, cur - 4, cur - 5];
  }, [today]);

  // 格式化输出字符串
  const currentFormattedResult = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${selectedYear}-${pad(selectedMonth + 1)}-${pad(selectedDay)} ${pad(selectedHour)}:${pad(selectedMinute)}`;
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute]);

  // 前后月切换
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // 设为现在快捷操作
  const handleSetNow = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const h = now.getHours();
    const min = now.getMinutes();

    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setSelectedHour(h);
    setSelectedMinute(min);
    setViewYear(y);
    setViewMonth(m);
    setCalendarViewMode('days');
  };

  // 今天 00:00 快捷操作
  const handleSetTodayStart = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setSelectedHour(0);
    setSelectedMinute(0);
    setViewYear(y);
    setViewMonth(m);
    setCalendarViewMode('days');
  };

  // 昨天此时快捷操作
  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = yesterday.getMonth();
    const d = yesterday.getDate();

    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setViewYear(y);
    setViewMonth(m);
    setCalendarViewMode('days');
  };

  // 生成日历网格天数数据
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0(日) - 6(六)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      monthType: 'prev' | 'current' | 'next';
      year: number;
      month: number;
    }> = [];

    // 上月填充天数
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: daysInPrevMonth - i,
        monthType: 'prev',
        year: prevY,
        month: prevM,
      });
    }

    // 当月天数
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        monthType: 'current',
        year: viewYear,
        month: viewMonth,
      });
    }

    // 下月填充天数（凑齐7的整倍数，通常补到35或42天）
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: i,
        monthType: 'next',
        year: nextY,
        month: nextM,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // 选择某一天
  const handleSelectDate = (item: { day: number; month: number; year: number; monthType: string }) => {
    setSelectedYear(item.year);
    setSelectedMonth(item.month);
    setSelectedDay(item.day);
    if (item.monthType !== 'current') {
      setViewYear(item.year);
      setViewMonth(item.month);
    }
  };

  // 递增/递减分钟微调
  const adjustMinute = (delta: number) => {
    let next = selectedMinute + delta;
    if (next >= 60) {
      next = 0;
      setSelectedHour((h) => (h + 1) % 24);
    } else if (next < 0) {
      next = 59;
      setSelectedHour((h) => (h === 0 ? 23 : h - 1));
    }
    setSelectedMinute(next);
  };

  // 递增/递减小时
  const adjustHour = (delta: number) => {
    let next = (selectedHour + delta) % 24;
    if (next < 0) next += 24;
    setSelectedHour(next);
  };

  const handleConfirm = () => {
    onConfirm(currentFormattedResult);
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onConfirm('');
    }
    onClose();
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* 弹窗头部 */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleRow}>
                  <CalendarIcon size={20} color={colors.accent} />
                  <Text style={styles.headerTitle}>
                    {isZh ? '选择交易时间' : 'Select Date & Time'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseCrossIcon size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 快捷预设按钮组 */}
              <View style={styles.quickPresetRow}>
                <TouchableOpacity
                  style={styles.presetBadge}
                  onPress={handleSetNow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetBadgeText}>
                    ⚡ {isZh ? '设为现在' : 'Now'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBadge}
                  onPress={handleSetTodayStart}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetBadgeText}>
                    📅 {isZh ? '今天 00:00' : 'Today 00:00'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBadge}
                  onPress={handleSetYesterday}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetBadgeText}>
                    ⏪ {isZh ? '昨天此时' : 'Yesterday'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 当前选中时间看板与 Tab 切换 */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'date' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('date')}
                  activeOpacity={0.7}
                >
                  <CalendarIcon size={16} color={activeTab === 'date' ? colors.accent : colors.textMuted} />
                  <Text style={[styles.tabText, activeTab === 'date' && styles.tabTextActive]}>
                    {`${selectedYear}-${pad(selectedMonth + 1)}-${pad(selectedDay)}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'time' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('time')}
                  activeOpacity={0.7}
                >
                  <ClockIcon size={16} color={activeTab === 'time' ? colors.accent : colors.textMuted} />
                  <Text style={[styles.tabText, activeTab === 'time' && styles.tabTextActive]}>
                    {`${pad(selectedHour)}:${pad(selectedMinute)}`}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 内容区 */}
              {activeTab === 'date' ? (
                /* 日期选择面板 */
                <View style={styles.panelContent}>
                  {/* 年月导航栏 */}
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity
                      style={styles.navArrowBtn}
                      onPress={() => {
                        if (calendarViewMode === 'years') {
                          setViewYear((y) => y - 1);
                        } else if (calendarViewMode === 'months') {
                          setViewYear((y) => y - 1);
                        } else {
                          handlePrevMonth();
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <ChevronLeftIcon size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.navPillsRow}>
                      {isZh ? (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.pickerNavPill,
                              calendarViewMode === 'years' && styles.pickerNavPillActive,
                            ]}
                            onPress={() =>
                              setCalendarViewMode((mode) => (mode === 'years' ? 'days' : 'years'))
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.monthNavTitle,
                                calendarViewMode === 'years' && styles.monthNavTitleActive,
                              ]}
                            >
                              {`${viewYear}年`}
                            </Text>
                            <ChevronDownIcon
                              size={14}
                              color={calendarViewMode === 'years' ? colors.accent : colors.textSecondary}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.pickerNavPill,
                              calendarViewMode === 'months' && styles.pickerNavPillActive,
                            ]}
                            onPress={() =>
                              setCalendarViewMode((mode) => (mode === 'months' ? 'days' : 'months'))
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.monthNavTitle,
                                calendarViewMode === 'months' && styles.monthNavTitleActive,
                              ]}
                            >
                              {MONTHS_ZH[viewMonth]}
                            </Text>
                            <ChevronDownIcon
                              size={14}
                              color={calendarViewMode === 'months' ? colors.accent : colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.pickerNavPill,
                              calendarViewMode === 'months' && styles.pickerNavPillActive,
                            ]}
                            onPress={() =>
                              setCalendarViewMode((mode) => (mode === 'months' ? 'days' : 'months'))
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.monthNavTitle,
                                calendarViewMode === 'months' && styles.monthNavTitleActive,
                              ]}
                            >
                              {MONTHS_EN[viewMonth]}
                            </Text>
                            <ChevronDownIcon
                              size={14}
                              color={calendarViewMode === 'months' ? colors.accent : colors.textSecondary}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.pickerNavPill,
                              calendarViewMode === 'years' && styles.pickerNavPillActive,
                            ]}
                            onPress={() =>
                              setCalendarViewMode((mode) => (mode === 'years' ? 'days' : 'years'))
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.monthNavTitle,
                                calendarViewMode === 'years' && styles.monthNavTitleActive,
                              ]}
                            >
                              {`${viewYear}`}
                            </Text>
                            <ChevronDownIcon
                              size={14}
                              color={calendarViewMode === 'years' ? colors.accent : colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.navArrowBtn}
                      onPress={() => {
                        if (calendarViewMode === 'years') {
                          setViewYear((y) => y + 1);
                        } else if (calendarViewMode === 'months') {
                          setViewYear((y) => y + 1);
                        } else {
                          handleNextMonth();
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <ChevronRightIcon size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {calendarViewMode === 'years' ? (
                    /* 年份选择器面板 */
                    <View style={styles.selectorViewContainer}>
                      <View style={styles.selectorSubHeader}>
                        <Text style={styles.selectorSubTitle}>
                          {isZh ? '快捷年份' : 'Quick Years'}
                        </Text>
                        <TouchableOpacity
                          style={styles.backToCalendarBtn}
                          onPress={() => setCalendarViewMode('days')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.backToCalendarText}>
                            {isZh ? '返回日历' : 'Back to Calendar'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* 快捷年份胶囊 */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickYearsScroll}
                        style={styles.quickYearsScrollWrap}
                      >
                        {quickYearPresets.map((yr) => {
                          const isActive = yr === viewYear;
                          return (
                            <TouchableOpacity
                              key={yr}
                              style={[
                                styles.quickYearChip,
                                isActive && styles.quickYearChipActive,
                              ]}
                              onPress={() => {
                                setViewYear(yr);
                                setCalendarViewMode('days');
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.quickYearChipText,
                                  isActive && styles.quickYearChipTextActive,
                                ]}
                              >
                                {yr === today.getFullYear()
                                  ? isZh
                                    ? `${yr}(今年)`
                                    : `${yr}(Current)`
                                  : `${yr}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* 滚动年份网格 */}
                      <ScrollView
                        style={styles.yearScrollArea}
                        contentContainerStyle={styles.yearGridContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {yearList.map((yr) => {
                          const isCurrentView = yr === viewYear;
                          const isTodayYear = yr === today.getFullYear();
                          return (
                            <TouchableOpacity
                              key={yr}
                              style={[
                                styles.yearGridItem,
                                isCurrentView && styles.yearGridItemActive,
                                isTodayYear && !isCurrentView && styles.yearGridItemToday,
                              ]}
                              onPress={() => {
                                setViewYear(yr);
                                setCalendarViewMode('days');
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.yearGridItemText,
                                  isCurrentView && styles.yearGridItemTextActive,
                                  isTodayYear && !isCurrentView && styles.yearGridItemTextToday,
                                ]}
                              >
                                {yr}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : calendarViewMode === 'months' ? (
                    /* 月份选择器面板 */
                    <View style={styles.selectorViewContainer}>
                      <View style={styles.selectorSubHeader}>
                        <Text style={styles.selectorSubTitle}>
                          {isZh ? '选择月份' : 'Select Month'}
                        </Text>
                        <TouchableOpacity
                          style={styles.backToCalendarBtn}
                          onPress={() => setCalendarViewMode('days')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.backToCalendarText}>
                            {isZh ? '返回日历' : 'Back to Calendar'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* 12个月份网格 (3列 x 4行) */}
                      <View style={styles.monthGrid}>
                        {Array.from({ length: 12 }, (_, i) => i).map((m) => {
                          const isCurrentMonth = m === viewMonth;
                          return (
                            <TouchableOpacity
                              key={m}
                              style={[
                                styles.monthGridItem,
                                isCurrentMonth && styles.monthGridItemActive,
                              ]}
                              onPress={() => {
                                setViewMonth(m);
                                setCalendarViewMode('days');
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.monthGridItemText,
                                  isCurrentMonth && styles.monthGridItemTextActive,
                                ]}
                              >
                                {isZh ? MONTHS_ZH[m] : MONTHS_EN[m]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    /* 日历天数网格 (默认) */
                    <>
                      {/* 星期行 */}
                      <View style={styles.weekdayRow}>
                        {(isZh ? WEEKDAYS_ZH : WEEKDAYS_EN).map((w, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.weekdayText,
                              (idx === 0 || idx === 6) && styles.weekendText,
                            ]}
                          >
                            {w}
                          </Text>
                        ))}
                      </View>

                      {/* 日期网格 */}
                      <View style={styles.calendarGrid}>
                        {calendarDays.map((item, idx) => {
                          const isSelected =
                            item.year === selectedYear &&
                            item.month === selectedMonth &&
                            item.day === selectedDay;
                          const isToday =
                            item.year === today.getFullYear() &&
                            item.month === today.getMonth() &&
                            item.day === today.getDate();
                          const isCurrentMonth = item.monthType === 'current';

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.dayCell,
                                isSelected && styles.dayCellSelected,
                                isToday && !isSelected && styles.dayCellToday,
                              ]}
                              onPress={() => handleSelectDate(item)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  !isCurrentMonth && styles.dayTextMuted,
                                  isSelected && styles.dayTextSelected,
                                  isToday && !isSelected && styles.dayTextToday,
                                ]}
                              >
                                {item.day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              ) : (
                /* 时间选择面板 */
                <View style={styles.panelContent}>
                  {/* 时间大数展示与步进微调 */}
                  <View style={styles.timeDisplayCard}>
                    <View style={styles.timeDigitBox}>
                      <TouchableOpacity
                        style={styles.timeAdjustBtn}
                        onPress={() => adjustHour(1)}
                      >
                        <Text style={styles.timeAdjustBtnText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDigitText}>{pad(selectedHour)}</Text>
                      <TouchableOpacity
                        style={styles.timeAdjustBtn}
                        onPress={() => adjustHour(-1)}
                      >
                        <Text style={styles.timeAdjustBtnText}>▼</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeUnitLabel}>{isZh ? '时 (Hour)' : 'Hour'}</Text>
                    </View>

                    <Text style={styles.timeColon}>:</Text>

                    <View style={styles.timeDigitBox}>
                      <TouchableOpacity
                        style={styles.timeAdjustBtn}
                        onPress={() => adjustMinute(1)}
                      >
                        <Text style={styles.timeAdjustBtnText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDigitText}>{pad(selectedMinute)}</Text>
                      <TouchableOpacity
                        style={styles.timeAdjustBtn}
                        onPress={() => adjustMinute(-1)}
                      >
                        <Text style={styles.timeAdjustBtnText}>▼</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeUnitLabel}>{isZh ? '分 (Minute)' : 'Minute'}</Text>
                    </View>
                  </View>

                  {/* 快捷分钟点选 */}
                  <Text style={styles.timeSectionSubtitle}>
                    {isZh ? '快捷常用分钟' : 'Quick Minutes'}
                  </Text>
                  <View style={styles.minuteGrid}>
                    {MINUTE_PRESETS.map((mVal) => {
                      const isMinuteSelected = selectedMinute === mVal;
                      return (
                        <TouchableOpacity
                          key={mVal}
                          style={[
                            styles.minuteChip,
                            isMinuteSelected && styles.minuteChipSelected,
                          ]}
                          onPress={() => setSelectedMinute(mVal)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.minuteChipText,
                              isMinuteSelected && styles.minuteChipTextSelected,
                            ]}
                          >
                            :{pad(mVal)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 底部操作区 */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearBtnText}>
                    {isZh ? '清空 (留空)' : 'Clear (Default)'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footerRightBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>{isZh ? '取消' : 'Cancel'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirm}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmBtnText}>{isZh ? '确定' : 'Confirm'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const getStyles = (colors: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : colors.cardBorderHighlight,
      padding: 20,
      shadowColor: isDark ? '#000000' : 'rgba(0, 0, 0, 0.2)',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 20,
      elevation: 12,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 4,
    },
    quickPresetRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    presetBadge: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetBadgeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(18, 26, 43, 0.9)' : colors.inputBackground,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tabButtonActive: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.16)' : colors.accentLight,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : colors.accent,
    },
    tabText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    panelContent: {
      minHeight: 280,
    },
    monthNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    navPillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pickerNavPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerNavPillActive: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : colors.accentLight,
      borderColor: colors.accent,
    },
    navArrowBtn: {
      padding: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderRadius: 8,
    },
    monthNavTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    monthNavTitleActive: {
      color: colors.accent,
    },
    selectorViewContainer: {
      minHeight: 240,
      justifyContent: 'flex-start',
    },
    selectorSubHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    selectorSubTitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    backToCalendarBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.accentLight,
    },
    backToCalendarText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '600',
    },
    quickYearsScrollWrap: {
      maxHeight: 34,
      marginBottom: 10,
    },
    quickYearsScroll: {
      gap: 6,
      paddingHorizontal: 2,
    },
    quickYearChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    quickYearChipActive: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : colors.accentLight,
      borderColor: colors.accent,
    },
    quickYearChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    quickYearChipTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    yearScrollArea: {
      height: 180,
    },
    yearGridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
      paddingBottom: 10,
    },
    yearGridItem: {
      width: '22%',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearGridItemActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    yearGridItemToday: {
      borderColor: colors.accent,
      borderWidth: 1.5,
    },
    yearGridItemText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    yearGridItemTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    yearGridItemTextToday: {
      color: colors.accent,
      fontWeight: '700',
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
      paddingTop: 6,
    },
    monthGridItem: {
      width: '31%',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 2,
    },
    monthGridItemActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    monthGridItemText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    monthGridItemTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 8,
    },
    weekdayText: {
      width: 36,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    weekendText: {
      color: colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
    },
    dayCell: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 2,
    },
    dayCellSelected: {
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
      elevation: 4,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    dayText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    dayTextMuted: {
      color: isDark ? '#334155' : '#CBD5E1',
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    dayTextToday: {
      color: colors.accent,
      fontWeight: '700',
    },
    timeDisplayCard: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(18, 26, 43, 0.8)' : colors.inputBackground,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    timeDigitBox: {
      alignItems: 'center',
    },
    timeAdjustBtn: {
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    timeAdjustBtnText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    timeDigitText: {
      color: colors.textPrimary,
      fontSize: 36,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    timeUnitLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    timeColon: {
      color: colors.accent,
      fontSize: 36,
      fontWeight: '800',
      marginHorizontal: 16,
      paddingBottom: 20,
    },
    timeSectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
    },
    minuteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    minuteChip: {
      width: '22%',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    minuteChipSelected: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : colors.accentLight,
      borderColor: colors.accent,
    },
    minuteChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    minuteChipTextSelected: {
      color: colors.accent,
      fontWeight: '700',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    clearBtn: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    clearBtnText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    footerRightBtns: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.inputBackground,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    confirmBtn: {
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    confirmBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
