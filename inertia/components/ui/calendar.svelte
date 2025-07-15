<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

  import { cn } from '$lib/utils-svelte'

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const MONTHS = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ]

  interface DayInfo {
    date: Date
    isSelected: boolean
    isToday: boolean
    isOutside?: boolean
  }

  interface Props {
    class?: string
    month?: Date
    selected?: Date | Date[] | { from: Date; to: Date }
    onSelect?: (date: Date | undefined) => void
    onMonthChange?: (month: Date) => void
    showOutsideDays?: boolean
  }

  const {
    class: className,
    month = new Date(),
    selected,
    onSelect,
    onMonthChange,
    showOutsideDays = true
  }: Props = $props()

  let currentMonth = $state(new Date())

  $effect(() => {
    currentMonth = month
  })

  function handlePreviousMonth() {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() - 1)
    currentMonth = date
    onMonthChange?.(date)
  }

  function handleNextMonth() {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() + 1)
    currentMonth = date
    onMonthChange?.(date)
  }

  function handleDateClick(date: Date) {
    onSelect?.(date)
  }

  function isSelected(date: Date): boolean {
    if (!selected) return false
    if (selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }
    return false
  }

  function isToday(date: Date): boolean {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const weeks = $derived.by(() => {
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate()

    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay()

    // Days in current month
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

    // Previous month days
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

    // Next month days
    const totalCells = 42
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
    const result: DayInfo[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7))
    }
    return result
  })
</script>

<div class={cn('p-3', className)}>
  <div class="flex justify-center pt-1 relative items-center">
    <button
      type="button"
      onclick={handlePreviousMonth}
      class={cn(
        'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border',
        'border-input bg-background hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="text-sm font-medium">
      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
    </span>
    <button
      type="button"
      onclick={handleNextMonth}
      class={cn(
        'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border',
        'border-input bg-background hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <ChevronRight class="h-4 w-4" />
    </button>
  </div>
  <div class="mt-4">
    <div class="flex">
      {#each DAYS as day}
        <div class="text-muted-foreground rounded-md w-9 text-[0.8rem] font-normal text-center">
          {day}
        </div>
      {/each}
    </div>
    {#each weeks as week}
      <div class="flex w-full mt-2">
        {#each week as day}
          <div
            class={cn('h-9 w-9 text-center text-sm p-0 relative', {
              'opacity-50': day.isOutside,
              'invisible': day.isOutside && !showOutsideDays
            })}
          >
            <button
              type="button"
              class={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                {
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground':
                    day.isSelected,
                  'bg-accent text-accent-foreground': day.isToday && !day.isSelected,
                  'hover:bg-accent hover:text-accent-foreground':
                    !day.isSelected && !day.isToday
                }
              )}
              onclick={() => { handleDateClick(day.date); }}
            >
              {day.date.getDate()}
            </button>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
