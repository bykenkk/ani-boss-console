import {
  addDays,
  addMilliseconds,
  compareDesc,
  differenceInMilliseconds,
  format,
  getTime,
  isBefore,
  isValid,
  parse,
  parseISO,
  subHours,
} from "date-fns";

export type DateValue = Date | number | string | null | undefined;

function toDate(value: DateValue) {
  if (typeof value === "string") return parseISO(value);
  return value instanceof Date ? value : new Date(value ?? Number.NaN);
}

function formatValue(value: DateValue, pattern: string, fallback: string) {
  const date = toDate(value);
  return isValid(date) ? format(date, pattern) : fallback;
}

function createUtcDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
) {
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
}

function startOfUtcDay(value: Date) {
  return createUtcDate(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function startOfUtcMonth(value: Date, monthOffset = 0) {
  return createUtcDate(value.getUTCFullYear(), value.getUTCMonth() + monthOffset, 1);
}

function addUtcDays(value: Date, days: number) {
  return createUtcDate(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate() + days,
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds(),
  );
}

function toUtcDisplayDate(value: Date) {
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds(),
  );
}

export function formatDateTime(value: DateValue, fallback = "-") {
  return formatValue(value, "yyyy-MM-dd HH:mm:ss", fallback);
}

export function formatDateTimeMinute(value: DateValue, fallback = "-") {
  return formatValue(value, "yyyy-MM-dd HH:mm", fallback);
}

export function formatDate(value: DateValue, fallback = "-") {
  return formatValue(value, "yyyy-MM-dd", fallback);
}

export function formatMonth(value: DateValue, fallback = "-") {
  return formatValue(value, "yyyy-MM", fallback);
}

export function formatMonthDay(value: DateValue, fallback = "-") {
  return formatValue(value, "MM-dd", fallback);
}

export function formatMonthDayTime(value: DateValue, fallback = "-") {
  const date =
    typeof value === "string" && /^\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
      ? parse(value, "MM-dd HH:mm", new Date())
      : toDate(value);
  return isValid(date) ? format(date, "MM-dd HH:mm") : fallback;
}

export function formatDateHour(value: DateValue, fallback = "-") {
  return formatValue(value, "yyyy-MM-dd HH:00", fallback);
}

export function formatUtcDate(value: DateValue, fallback = "-") {
  const date = toDate(value);
  return isValid(date) ? format(toUtcDisplayDate(date), "yyyy-MM-dd") : fallback;
}

export function formatCurrentDateTime() {
  return formatDateTimeMinute(new Date());
}

export function formatCurrentDate() {
  return formatDate(new Date());
}

export function formatCurrentMonth() {
  return formatValue(new Date(), "yyyy-MM", "-");
}

export function formatShortYearMonth(value: DateValue, fallback = "-") {
  return formatValue(value, "yyMM", fallback);
}

export function getCurrentTimestamp() {
  return getTime(new Date());
}

export function hasElapsed(
  value: DateValue,
  durationMs: number,
  reference: DateValue = new Date(),
) {
  const start = toDate(value);
  const end = toDate(reference);
  if (!isValid(start) || !isValid(end)) return false;
  return differenceInMilliseconds(end, start) >= durationMs;
}

export function addDaysToFutureDateTime(
  value: DateValue,
  days: number,
  reference: DateValue = new Date(),
) {
  const candidate = toDate(value);
  const current = toDate(reference);
  const start = isValid(candidate) && !isBefore(candidate, current) ? candidate : current;
  return formatDateTimeMinute(addDays(start, days));
}

export function compareDateValuesDesc(left: DateValue, right: DateValue) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (isValid(leftDate) && isValid(rightDate)) return compareDesc(leftDate, rightDate);
  return String(right ?? "").localeCompare(String(left ?? ""));
}

export function getUtcMonthToDateRanges(reference: DateValue = new Date(), trailingDays = 7) {
  const candidate = toDate(reference);
  const current = isValid(candidate) ? candidate : new Date();
  const currentStart = startOfUtcMonth(current);
  const previousStart = startOfUtcMonth(current, -1);
  const projectedPreviousEnd = addMilliseconds(
    previousStart,
    differenceInMilliseconds(current, currentStart),
  );
  const previousEnd = isBefore(projectedPreviousEnd, currentStart)
    ? projectedPreviousEnd
    : currentStart;
  const trendStart = addUtcDays(startOfUtcDay(current), -(Math.max(1, trailingDays) - 1));

  return {
    currentStart: currentStart.toISOString(),
    currentEnd: current.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: previousEnd.toISOString(),
    trendStart: trendStart.toISOString(),
  };
}

export type MeteringPeriod = "month" | "recent-seven-days" | "previous-month";

export function getUtcMeteringRanges(period: MeteringPeriod, reference: DateValue = new Date()) {
  const base = getUtcMonthToDateRanges(reference);
  const ranges = { ...base, trendEnd: base.currentEnd };
  if (period === "month") return ranges;

  const candidate = toDate(reference);
  const current = isValid(candidate) ? candidate : new Date();

  if (period === "recent-seven-days") {
    const currentStart = new Date(ranges.trendStart);
    return {
      ...ranges,
      currentStart: currentStart.toISOString(),
      previousStart: addUtcDays(currentStart, -7).toISOString(),
      previousEnd: addMilliseconds(currentStart, -1).toISOString(),
    };
  }

  const monthStart = startOfUtcMonth(current);
  const previousMonthStart = startOfUtcMonth(current, -1);
  return {
    ...ranges,
    currentStart: previousMonthStart.toISOString(),
    currentEnd: addMilliseconds(monthStart, -1).toISOString(),
    previousStart: startOfUtcMonth(current, -2).toISOString(),
    previousEnd: addMilliseconds(previousMonthStart, -1).toISOString(),
  };
}

export type MeteringRanges = ReturnType<typeof getUtcMeteringRanges>;

export function listUtcDateKeys(start: DateValue, count: number) {
  const date = toDate(start);
  if (!isValid(date) || count <= 0) return [];
  return Array.from({ length: count }, (_, index) =>
    formatUtcDate(addUtcDays(date, index), ""),
  ).filter(Boolean);
}

const DATE_TIME_PICKER_PATTERN = "yyyy-MM-dd HH:mm:ss";

export function getRecentDateTimeRange(hours = 24): [string, string] {
  const end = new Date();
  return [
    format(subHours(end, Math.max(1, hours)), DATE_TIME_PICKER_PATTERN),
    format(end, DATE_TIME_PICKER_PATTERN),
  ];
}

export function toRfc3339DateTime(value: string) {
  const parsed = parse(value, DATE_TIME_PICKER_PATTERN, new Date());
  return isValid(parsed) ? parsed.toISOString() : undefined;
}
