import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  isPast,
  isFuture,
  getDateRange,
  dateDiff,
  formatDuration,
  parseDate,
} from '#libs/date_utils'

// ============================================================================
// formatDate
// ============================================================================
test.group('formatDate', () => {
  test('formats DateTime object', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    assert.equal(formatDate(dt), '15/03/2024')
  })

  test('formats JS Date object', ({ assert }) => {
    const date = new Date(2024, 2, 15) // month is 0-indexed
    assert.equal(formatDate(date), '15/03/2024')
  })

  test('formats ISO string', ({ assert }) => {
    assert.equal(formatDate('2024-03-15'), '15/03/2024')
  })

  test('formats with custom format', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    assert.equal(formatDate(dt, 'yyyy-MM-dd'), '2024-03-15')
  })

  test('returns empty for null', ({ assert }) => {
    assert.equal(formatDate(null), '')
  })

  test('returns empty for invalid date string', ({ assert }) => {
    assert.equal(formatDate('not-a-date'), '')
  })
})

// ============================================================================
// formatDateTime
// ============================================================================
test.group('formatDateTime', () => {
  test('formats with default datetime format', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14, minute: 30 })
    assert.equal(formatDateTime(dt), '15/03/2024 14:30')
  })

  test('returns empty for null', ({ assert }) => {
    assert.equal(formatDateTime(null), '')
  })

  test('formats with custom format', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14, minute: 30 })
    assert.equal(formatDateTime(dt, 'HH:mm dd/MM'), '14:30 15/03')
  })
})

// ============================================================================
// formatRelativeTime
// ============================================================================
test.group('formatRelativeTime', () => {
  test('returns relative time string for recent dates', ({ assert }) => {
    const recent = DateTime.now().minus({ hours: 2 })
    const result = formatRelativeTime(recent)
    assert.isTrue(result.length > 0)
  })

  test('returns empty for null', ({ assert }) => {
    assert.equal(formatRelativeTime(null), '')
  })

  test('handles JS Date', ({ assert }) => {
    const date = new Date(Date.now() - 3600000) // 1 hour ago
    const result = formatRelativeTime(date)
    assert.isTrue(result.length > 0)
  })

  test('handles ISO string', ({ assert }) => {
    const isoString = DateTime.now().minus({ days: 1 }).toISO()
    const result = formatRelativeTime(isoString)
    assert.isTrue(result.length > 0)
  })

  test('returns empty for invalid date string', ({ assert }) => {
    assert.equal(formatRelativeTime('invalid-date'), '')
  })
})

// ============================================================================
// startOfDay / endOfDay
// ============================================================================
test.group('startOfDay', () => {
  test('returns start of day for DateTime', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14, minute: 30 })
    const result = startOfDay(dt)
    assert.equal(result.hour, 0)
    assert.equal(result.minute, 0)
    assert.equal(result.second, 0)
  })

  test('returns start of day for JS Date', ({ assert }) => {
    const date = new Date(2024, 2, 15, 14, 30)
    const result = startOfDay(date)
    assert.equal(result.hour, 0)
    assert.equal(result.minute, 0)
  })
})

test.group('endOfDay', () => {
  test('returns end of day for DateTime', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14 })
    const result = endOfDay(dt)
    assert.equal(result.hour, 23)
    assert.equal(result.minute, 59)
    assert.equal(result.second, 59)
  })

  test('returns end of day for JS Date', ({ assert }) => {
    const date = new Date(2024, 2, 15, 14)
    const result = endOfDay(date)
    assert.equal(result.hour, 23)
  })
})

// ============================================================================
// startOfWeek / endOfWeek
// ============================================================================
test.group('startOfWeek', () => {
  test('returns Monday for DateTime', ({ assert }) => {
    // March 15 2024 is a Friday
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    const result = startOfWeek(dt)
    assert.equal(result.weekday, 1) // Monday
  })

  test('returns same day if already Monday', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 11 }) // Monday
    const result = startOfWeek(dt)
    assert.equal(result.day, 11)
  })
})

test.group('endOfWeek', () => {
  test('returns Sunday for DateTime', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    const result = endOfWeek(dt)
    assert.equal(result.weekday, 7) // Sunday
  })
})

// ============================================================================
// startOfMonth / endOfMonth
// ============================================================================
test.group('startOfMonth', () => {
  test('returns first day of month', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    const result = startOfMonth(dt)
    assert.equal(result.day, 1)
  })
})

test.group('endOfMonth', () => {
  test('returns last day of month', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 3, day: 15 })
    const result = endOfMonth(dt)
    assert.equal(result.day, 31) // March has 31 days
  })

  test('handles February', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2024, month: 2, day: 10 })
    const result = endOfMonth(dt)
    assert.equal(result.day, 29) // 2024 is a leap year
  })

  test('handles non-leap year February', ({ assert }) => {
    const dt = DateTime.fromObject({ year: 2023, month: 2, day: 10 })
    const result = endOfMonth(dt)
    assert.equal(result.day, 28)
  })
})

// ============================================================================
// isToday
// ============================================================================
test.group('isToday', () => {
  test('returns true for today', ({ assert }) => {
    assert.isTrue(isToday(DateTime.now()))
  })

  test('returns true for today as JS Date', ({ assert }) => {
    assert.isTrue(isToday(new Date()))
  })

  test('returns false for yesterday', ({ assert }) => {
    const yesterday = DateTime.now().minus({ days: 1 })
    assert.isFalse(isToday(yesterday))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isToday(null))
  })

  test('handles ISO string for today', ({ assert }) => {
    const todayISO = DateTime.now().toISO()
    assert.isTrue(isToday(todayISO))
  })
})

// ============================================================================
// isPast
// ============================================================================
test.group('isPast', () => {
  test('returns true for past date', ({ assert }) => {
    const past = DateTime.now().minus({ days: 1 })
    assert.isTrue(isPast(past))
  })

  test('returns false for future date', ({ assert }) => {
    const future = DateTime.now().plus({ days: 1 })
    assert.isFalse(isPast(future))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isPast(null))
  })

  test('handles ISO string', ({ assert }) => {
    const pastISO = DateTime.now().minus({ hours: 1 }).toISO()
    assert.isTrue(isPast(pastISO))
  })
})

// ============================================================================
// isFuture
// ============================================================================
test.group('isFuture', () => {
  test('returns true for future date', ({ assert }) => {
    const future = DateTime.now().plus({ days: 1 })
    assert.isTrue(isFuture(future))
  })

  test('returns false for past date', ({ assert }) => {
    const past = DateTime.now().minus({ days: 1 })
    assert.isFalse(isFuture(past))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isFuture(null))
  })
})

// ============================================================================
// getDateRange
// ============================================================================
test.group('getDateRange', () => {
  test('returns correct range of dates', ({ assert }) => {
    const start = DateTime.fromObject({ year: 2024, month: 3, day: 1 })
    const end = DateTime.fromObject({ year: 2024, month: 3, day: 5 })
    const range = getDateRange(start, end)
    assert.equal(range.length, 5)
    assert.equal(range[0]!.day, 1)
    assert.equal(range[4]!.day, 5)
  })

  test('returns single date when start equals end', ({ assert }) => {
    const date = DateTime.fromObject({ year: 2024, month: 3, day: 1 })
    const range = getDateRange(date, date)
    assert.equal(range.length, 1)
  })

  test('returns empty array when start is after end', ({ assert }) => {
    const start = DateTime.fromObject({ year: 2024, month: 3, day: 5 })
    const end = DateTime.fromObject({ year: 2024, month: 3, day: 1 })
    const range = getDateRange(start, end)
    assert.equal(range.length, 0)
  })
})

// ============================================================================
// dateDiff
// ============================================================================
test.group('dateDiff', () => {
  test('calculates difference in days', ({ assert }) => {
    const start = DateTime.fromObject({ year: 2024, month: 3, day: 1 })
    const end = DateTime.fromObject({ year: 2024, month: 3, day: 11 })
    assert.equal(dateDiff(start, end, 'days'), 10)
  })

  test('calculates difference in hours', ({ assert }) => {
    const start = DateTime.fromObject({ year: 2024, month: 3, day: 1, hour: 0 })
    const end = DateTime.fromObject({ year: 2024, month: 3, day: 1, hour: 12 })
    assert.equal(dateDiff(start, end, 'hours'), 12)
  })

  test('returns absolute difference (start after end)', ({ assert }) => {
    const start = DateTime.fromObject({ year: 2024, month: 3, day: 11 })
    const end = DateTime.fromObject({ year: 2024, month: 3, day: 1 })
    assert.equal(dateDiff(start, end, 'days'), 10)
  })

  test('handles JS Date inputs', ({ assert }) => {
    const start = new Date(2024, 2, 1)
    const end = new Date(2024, 2, 11)
    assert.equal(dateDiff(start, end, 'days'), 10)
  })

  test('handles ISO string inputs', ({ assert }) => {
    const diff = dateDiff('2024-03-01', '2024-03-11', 'days')
    assert.equal(diff, 10)
  })
})

// ============================================================================
// formatDuration
// ============================================================================
test.group('formatDuration', () => {
  test('formats minutes only', ({ assert }) => {
    assert.equal(formatDuration(45), '45 phút')
  })

  test('formats exact hours', ({ assert }) => {
    assert.equal(formatDuration(120), '2 giờ')
  })

  test('formats hours and minutes', ({ assert }) => {
    assert.equal(formatDuration(90), '1 giờ 30 phút')
  })

  test('formats less than 60 minutes', ({ assert }) => {
    assert.equal(formatDuration(1), '1 phút')
  })

  test('formats zero minutes', ({ assert }) => {
    assert.equal(formatDuration(0), '0 phút')
  })
})

// ============================================================================
// parseDate
// ============================================================================
test.group('parseDate', () => {
  test('parses DateTime object', ({ assert }) => {
    const dt = DateTime.now()
    const result = parseDate(dt)
    assert.isNotNull(result)
    assert.isTrue(result!.isValid)
  })

  test('parses JS Date', ({ assert }) => {
    const date = new Date()
    const result = parseDate(date)
    assert.isNotNull(result)
    assert.isTrue(result!.isValid)
  })

  test('parses ISO string', ({ assert }) => {
    const result = parseDate('2024-03-15')
    assert.isNotNull(result)
    assert.equal(result!.day, 15)
    assert.equal(result!.month, 3)
  })

  test('parses dd/MM/yyyy format', ({ assert }) => {
    const result = parseDate('15/03/2024')
    assert.isNotNull(result)
    assert.equal(result!.day, 15)
  })

  test('returns null for null input', ({ assert }) => {
    assert.isNull(parseDate(null))
  })

  test('returns null for undefined', ({ assert }) => {
    assert.isNull(parseDate(undefined))
  })

  test('returns null for unparseable string', ({ assert }) => {
    assert.isNull(parseDate('not-a-date-at-all'))
  })
})
