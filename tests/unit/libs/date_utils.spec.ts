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

test.group('Date utils', () => {
  test('formatting and parsing accept supported date inputs while rejecting invalid ones', ({
    assert,
  }) => {
    const date = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14, minute: 30 })

    assert.equal(formatDate(date), '15/03/2024')
    assert.equal(formatDate(new Date(2024, 2, 15)), '15/03/2024')
    assert.equal(formatDateTime(date), '15/03/2024 14:30')
    assert.equal(formatDateTime(date, 'HH:mm dd/MM'), '14:30 15/03')
    assert.isTrue(formatRelativeTime(DateTime.now().minus({ hours: 2 })).length > 0)
    assert.equal(parseDate('2024-03-15')?.toISODate(), '2024-03-15')
    assert.equal(parseDate('15/03/2024')?.toISODate(), '2024-03-15')
    assert.equal(parseDate('03/15/2024')?.toISODate(), '2024-03-15')
    assert.equal(parseDate(1710460800000)?.toISODate(), '2024-03-15')
    assert.equal(formatDate('not-a-date'), '')
    assert.equal(formatRelativeTime('invalid-date'), '')
    assert.isNull(parseDate({ value: '2024-03-15' }))
  })

  test('calendar boundary helpers and relative predicates preserve expected temporal edges', ({
    assert,
  }) => {
    const date = DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 14, minute: 30 })
    const start = DateTime.fromISO('2024-03-01')
    const end = DateTime.fromISO('2024-03-03')
    const past = DateTime.now().minus({ hours: 1 })
    const future = DateTime.now().plus({ hours: 1 })

    assert.equal(startOfDay(date).toFormat('HH:mm:ss'), '00:00:00')
    assert.equal(endOfDay(date).hour, 23)
    assert.equal(startOfWeek(date).weekday, 1)
    assert.equal(endOfWeek(date).weekday, 7)
    assert.equal(startOfMonth(date).day, 1)
    assert.equal(endOfMonth(DateTime.fromObject({ year: 2024, month: 2, day: 10 })).day, 29)
    assert.equal(endOfMonth(DateTime.fromObject({ year: 2023, month: 2, day: 10 })).day, 28)
    assert.deepEqual(
      getDateRange(start, end).map((value) => value.toISODate()),
      ['2024-03-01', '2024-03-02', '2024-03-03']
    )
    assert.deepEqual(getDateRange(end, start), [])
    assert.isTrue(isToday(DateTime.now()))
    assert.isFalse(isToday(DateTime.now().minus({ days: 1 })))
    assert.isFalse(isToday(null))
    assert.isTrue(isPast(past))
    assert.isFalse(isPast(future))
    assert.isTrue(isFuture(future))
    assert.isFalse(isFuture(past))
    assert.isFalse(isPast(null))
    assert.isFalse(isFuture(null))
  })

  test('dateDiff and duration formatting keep absolute deltas readable', ({ assert }) => {
    const start = DateTime.fromISO('2024-03-01T00:00:00')
    const end = DateTime.fromISO('2024-03-03T12:00:00')

    assert.equal(dateDiff(start, end), 2.5)
    assert.equal(dateDiff(end, start), 2.5)
    assert.equal(dateDiff(new Date(2024, 2, 1), new Date(2024, 2, 1, 12), 'hours'), 12)
    assert.isTrue(Number.isNaN(dateDiff('2024-03-01T00:00:00', '2024-03-01T30:00:00', 'hours')))
    assert.equal(formatDuration(0), '0 phút')
    assert.equal(formatDuration(45), '45 phút')
    assert.equal(formatDuration(120), '2 giờ')
    assert.equal(formatDuration(135), '2 giờ 15 phút')
  })
})
