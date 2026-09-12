/**
 * 格式化当前日期时间为 YYYY-MM-DD HH:mm
 */
export function formatCurrentDateTime(date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 解析用户输入的交易日期时间字符串为时间戳
 * 若留空或仅空格，默认返回当前系统时间戳
 */
export function parseTransactionDateTime(
  input: string,
  defaultTimestamp = Date.now()
): { valid: boolean; timestamp: number } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: true, timestamp: defaultTimestamp };
  }

  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!match) {
    return { valid: false, timestamp: 0 };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const now = new Date();
  const hours = match[4] !== undefined ? parseInt(match[4], 10) : now.getHours();
  const minutes = match[5] !== undefined ? parseInt(match[5], 10) : now.getMinutes();
  const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 0;

  if (month < 0 || month > 11 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return { valid: false, timestamp: 0 };
  }

  const d = new Date(year, month, day, hours, minutes, seconds);
  if (isNaN(d.getTime())) {
    return { valid: false, timestamp: 0 };
  }

  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return { valid: false, timestamp: 0 };
  }

  if (year < 2008 || year > now.getFullYear() + 2) {
    return { valid: false, timestamp: 0 };
  }

  return { valid: true, timestamp: d.getTime() };
}
