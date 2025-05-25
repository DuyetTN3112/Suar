import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
]

interface CalendarProps {
  mode?: "single" | "range" | "multiple"
  selected?: Date | Date[] | { from: Date; to: Date }
  onSelect?: (date: Date | undefined) => void
  disabled?: { from: Date; to: Date } | Date | Date[]
  className?: string
  month?: Date
  onMonthChange?: (month: Date) => void
  numberOfMonths?: number
  showOutsideDays?: boolean
  classNames?: Record<string, string>
}

interface DayInfo {
  date: Date
  isSelected: boolean
  isToday: boolean
  isOutside?: boolean
}

function CalendarComponent({
  className,
  month = new Date(),
  onMonthChange,

  selected,
  onSelect,

  showOutsideDays = true,

}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    month || new Date()
  )

  const handlePreviousMonth = () => {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() - 1)
    setCurrentMonth(date)
    onMonthChange?.(date)
  }

  const handleNextMonth = () => {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() + 1)
    setCurrentMonth(date)
    onMonthChange?.(date)
  }

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  // Lấy ngày đầu tiên của tháng
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const handleDateClick = (date: Date) => {
    onSelect?.(date)
  }

  const isSelected = (date: Date) => {
    if (!selected) return false

    if (selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }

    return false
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Tạo mảng các ngày trong tháng
  const days: DayInfo[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      i + 1
    )
    return {
      date,
      isSelected: isSelected(date),
      isToday: isToday(date)
    }
  })

  // Tạo mảng các ngày của tháng trước (nếu cần)
  const previousMonthDays: DayInfo[] = showOutsideDays
    ? Array.from({ length: firstDayOfMonth }, (_, i) => {
        const daysInPrevMonth = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          0
        ).getDate()
        const date = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() - 1,
          daysInPrevMonth - firstDayOfMonth + i + 1
        )
        return {
          date,
          isOutside: true,
          isSelected: isSelected(date),
          isToday: isToday(date)
        }
      })
    : []

  // Tính số ngày cần hiển thị cho tháng sau để điền đủ lưới 6x7
  const totalCells = 42 // 6 tuần x 7 ngày
  const nextMonthDays: DayInfo[] = showOutsideDays
    ? Array.from(
        { length: totalCells - (previousMonthDays.length + days.length) },
        (_, i) => {
          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            i + 1
          )
          return {
            date,
            isOutside: true,
            isSelected: isSelected(date),
            isToday: isToday(date)
          }
        }
      )
    : []

  const allDays = [...previousMonthDays, ...days, ...nextMonthDays]

  // Chia thành các tuần
  const weeks: DayInfo[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex justify-center pt-1 relative items-center">
        <button
          onClick={handlePreviousMonth}
          className={cn(
            "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border",
            "border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={handleNextMonth}
          className={cn(
            "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border",
            "border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">
        <div className="flex">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground rounded-md w-9 text-[0.8rem] font-normal text-center"
            >
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex w-full mt-2">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn("h-9 w-9 text-center text-sm p-0 relative", {
                  "opacity-50": day.isOutside,
                  "invisible": day.isOutside && !showOutsideDays,
                })}
              >
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    {
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground":
                        day.isSelected,
                      "bg-accent text-accent-foreground": day.isToday && !day.isSelected,
                      "hover:bg-accent hover:text-accent-foreground":
                        !day.isSelected && !day.isToday,
                    }
                  )}
                  onClick={() => handleDateClick(day.date)}
                >
                  {day.date.getDate()}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

CalendarComponent.displayName = "Calendar"

export { CalendarComponent as Calendar }
