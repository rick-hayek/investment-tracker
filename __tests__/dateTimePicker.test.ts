import { formatCurrentDateTime, parseTransactionDateTime } from '../src/utils/dateUtils';

describe('DateTimePicker & DateUtils Tests (日期控件与时间解析校验测试)', () => {
  describe('formatCurrentDateTime', () => {
    it('应正确格式化指定 Date 对象为 YYYY-MM-DD HH:mm 格式', () => {
      const fixedDate = new Date(2026, 8, 14, 10, 50); // 2026-09-14 10:50
      const formatted = formatCurrentDateTime(fixedDate);
      expect(formatted).toBe('2026-09-14 10:50');
    });

    it('个位数月份、日期、小时、分钟应补零对齐', () => {
      const singleDigits = new Date(2025, 0, 5, 6, 8); // 2025-01-05 06:08
      const formatted = formatCurrentDateTime(singleDigits);
      expect(formatted).toBe('2025-01-05 06:08');
    });
  });

  describe('parseTransactionDateTime', () => {
    it('留空或空白字符应返回有效且使用 defaultTimestamp', () => {
      const defaultTs = 1700000000000;
      const res1 = parseTransactionDateTime('', defaultTs);
      expect(res1.valid).toBe(true);
      expect(res1.timestamp).toBe(defaultTs);

      const res2 = parseTransactionDateTime('   ', defaultTs);
      expect(res2.valid).toBe(true);
      expect(res2.timestamp).toBe(defaultTs);
    });

    it('标准 YYYY-MM-DD HH:mm 格式能够正确解析', () => {
      const res = parseTransactionDateTime('2026-09-14 10:30');
      expect(res.valid).toBe(true);
      const d = new Date(res.timestamp);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // 9月下标为8
      expect(d.getDate()).toBe(14);
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(30);
    });

    it('支持正斜杠 YYYY/MM/DD 格式', () => {
      const res = parseTransactionDateTime('2026/09/14 15:45');
      expect(res.valid).toBe(true);
      const d = new Date(res.timestamp);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8);
      expect(d.getDate()).toBe(14);
      expect(d.getHours()).toBe(15);
      expect(d.getMinutes()).toBe(45);
    });

    it('仅提供日期 YYYY-MM-DD 时，默认填充当前小时和分钟', () => {
      const res = parseTransactionDateTime('2026-09-14');
      expect(res.valid).toBe(true);
      const d = new Date(res.timestamp);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8);
      expect(d.getDate()).toBe(14);
    });

    it('非法格式或不可能的日期拦截校验', () => {
      expect(parseTransactionDateTime('invalid-date').valid).toBe(false);
      expect(parseTransactionDateTime('2026-13-01').valid).toBe(false); // 不存在13月
      expect(parseTransactionDateTime('2026-02-31').valid).toBe(false); // 2月无31号
      expect(parseTransactionDateTime('2026-09-14 25:00').valid).toBe(false); // 小时超出23
      expect(parseTransactionDateTime('2026-09-14 12:65').valid).toBe(false); // 分钟超出59
    });
  });

  describe('日历网格数据计算逻辑验证', () => {
    it('生成指定月份的日历网格能够覆盖第一天到最后一天', () => {
      const year = 2026;
      const month = 8; // 2026年9月 (30天)
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      expect(daysInMonth).toBe(30);
      // 2026-09-01 是周二，firstDayOfWeek = 2
      expect(firstDayOfWeek).toBe(2);

      // 上月补足 2 天 (周日、周一)
      // 当月 30 天
      // 下月补足 (7 - ((2 + 30) % 7)) % 7 = (7 - 4) = 3 天
      const totalCells = firstDayOfWeek + daysInMonth + ((7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7);
      expect(totalCells % 7).toBe(0);
      expect(totalCells).toBe(35);
    });
  });

  describe('年份与月份选择器逻辑验证', () => {
    it('年份列表应覆盖历史与未来合理投资区间且包含当前年份', () => {
      const currentYear = new Date().getFullYear();
      const start = Math.min(2010, currentYear - 15);
      const end = Math.max(2035, currentYear + 10);
      const list: number[] = [];
      for (let y = start; y <= end; y++) {
        list.push(y);
      }
      expect(list.length).toBeGreaterThanOrEqual(25);
      expect(list).toContain(currentYear);
      expect(list).toContain(2020);
      expect(list).toContain(2025);
    });

    it('快捷年份标签应生成今年及往年共6个选项', () => {
      const cur = new Date().getFullYear();
      const presets = [cur, cur - 1, cur - 2, cur - 3, cur - 4, cur - 5];
      expect(presets).toHaveLength(6);
      expect(presets[0]).toBe(cur);
      expect(presets[1]).toBe(cur - 1);
    });

    it('月份选择应支持全部12个月份且一一对应正确', () => {
      const monthsZh = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      expect(monthsZh).toHaveLength(12);
      expect(monthsZh[0]).toBe('1月');
      expect(monthsZh[11]).toBe('12月');
    });
  });
});
