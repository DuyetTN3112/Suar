<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { Calendar, ChevronLeft, ChevronRight } from 'lucide-svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
    onTaskClick?: (task: Task) => void
  }

  const { store, metadata, onTaskClick }: Props = $props()
  const { t } = useTranslation()

  // View config: show 4 weeks at a time
  const WEEKS_TO_SHOW = 4
  const DAY_WIDTH = 40 // px per day
  const ROW_HEIGHT = 40 // px per row

  let viewStartDate = $state(getMonday(new Date()))

  function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  const totalDays = $derived(WEEKS_TO_SHOW * 7)
  const viewEndDate = $derived(addDays(viewStartDate, totalDays))

  // Generate day columns
  const days = $derived.by(() => {
    const result: Array<{ date: Date; label: string; isWeekend: boolean; isToday: boolean }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(viewStartDate, i)
      const dayOfWeek = d.getDay()
      result.push({
        date: d,
        label: d.getDate().toString(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: d.getTime() === today.getTime(),
      })
    }
    return result
  })

  // Generate week headers
  const weeks = $derived.by(() => {
    const result: Array<{ label: string; days: number; startIdx: number }> = []
    let currentWeek = -1

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(viewStartDate, i)
      const weekNum = getWeekNumber(d)

      if (weekNum !== currentWeek) {
        currentWeek = weekNum
        const monthName = d.toLocaleDateString('vi-VN', { month: 'short' })
        result.push({
          label: `${monthName} - Tuần ${weekNum}`,
          days: 1,
          startIdx: i,
        })
      } else {
        result[result.length - 1].days++
      }
    }
    return result
  })

  function getWeekNumber(date: Date): number {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  // Filter tasks that have due dates and overlap with the visible range
  const timelineTasks = $derived.by(() => {
    return store.timelineTasks.filter((task) => {
      if (!task.due_date) return false
      const dueDate = new Date(task.due_date)
      // Show task if its due date falls within the view range
      // or if it was created before the view end
      const created = new Date(task.created_at)
      return dueDate >= viewStartDate && created <= viewEndDate
    })
  })

  // Calculate bar position for a task
  function getTaskBar(task: Task): { left: number; width: number } | null {
    if (!task.due_date) return null

    const dueDate = new Date(task.due_date)
    dueDate.setHours(0, 0, 0, 0)

    const startDate = new Date(task.created_at)
    startDate.setHours(0, 0, 0, 0)

    // Clamp to view range
    const barStart = Math.max(startDate.getTime(), viewStartDate.getTime())
    const barEnd = Math.min(dueDate.getTime(), viewEndDate.getTime())

    if (barStart >= viewEndDate.getTime() || barEnd <= viewStartDate.getTime()) return null

    const startOffset = Math.floor((barStart - viewStartDate.getTime()) / 86400000)
    const endOffset = Math.floor((barEnd - viewStartDate.getTime()) / 86400000)

    const left = startOffset * DAY_WIDTH
    const width = Math.max((endOffset - startOffset + 1) * DAY_WIDTH - 4, DAY_WIDTH - 4) // min 1 day

    return { left, width }
  }

  const statusBarColors: Record<string, string> = {
    todo: 'bg-slate-400',
    in_progress: 'bg-blue-500',
    in_review: 'bg-fuchsia-500',
    done: 'bg-orange-500',
    cancelled: 'bg-red-400',
  }

  function navigateWeeks(direction: number) {
    viewStartDate = addDays(viewStartDate, direction * 7)
  }

  function goToToday() {
    viewStartDate = getMonday(new Date())
  }
</script>

<div class="rounded-lg border bg-card overflow-hidden">
  <!-- Navigation -->
  <div class="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
    <div class="flex items-center gap-2">
      <Calendar class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-medium">
        {viewStartDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        —
        {addDays(viewStartDate, totalDays - 1).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
    </div>
    <div class="flex items-center gap-1">
      <button
        class="rounded p-1 hover:bg-muted transition-colors"
        onclick={() => { navigateWeeks(-1); }}
        title="Previous week"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <button
        class="rounded px-2 py-1 text-xs hover:bg-muted transition-colors"
        onclick={goToToday}
      >
        {t('common.today', {}, 'Hôm nay')}
      </button>
      <button
        class="rounded p-1 hover:bg-muted transition-colors"
        onclick={() => { navigateWeeks(1); }}
        title="Next week"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>

  {#if store.isLoading}
    <div class="flex items-center justify-center h-64 text-muted-foreground">
      <div class="flex flex-col items-center gap-2">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span class="text-sm">{t('common.loading', {}, 'Đang tải...')}</span>
      </div>
    </div>
  {:else if timelineTasks.length === 0}
    <div class="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
      <Calendar class="h-8 w-8" />
      <p class="text-sm">{t('task.no_timeline_tasks', {}, 'Không có task có ngày hạn trong khoảng thời gian này')}</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <div style="min-width: {totalDays * DAY_WIDTH + 240}px;">
        <!-- Week Headers -->
        <div class="flex border-b">
          <div class="w-[240px] shrink-0 border-r bg-muted/20 px-3 py-1.5">
            <span class="text-xs font-medium text-muted-foreground">{t('task.task_title', {}, 'Nhiệm vụ')}</span>
          </div>
          <div class="flex">
            {#each weeks as week}
              <div
                class="border-r text-xs font-medium text-muted-foreground px-2 py-1.5 text-center"
                style="width: {week.days * DAY_WIDTH}px"
              >
                {week.label}
              </div>
            {/each}
          </div>
        </div>

        <!-- Day Headers -->
        <div class="flex border-b">
          <div class="w-[240px] shrink-0 border-r"></div>
          <div class="flex">
            {#each days as day}
              <div
                class="text-center text-[10px] py-1 border-r {day.isToday
                  ? 'bg-primary/10 text-primary font-bold'
                  : day.isWeekend
                    ? 'bg-muted/40 text-muted-foreground/60'
                    : 'text-muted-foreground'}"
                style="width: {DAY_WIDTH}px"
              >
                {day.label}
              </div>
            {/each}
          </div>
        </div>

        <!-- Task Rows -->
        {#each timelineTasks as task, idx (task.id)}
          {@const bar = getTaskBar(task)}
          <div
            class="flex border-b hover:bg-muted/20 transition-colors {idx % 2 === 0 ? '' : 'bg-muted/5'}"
            style="height: {ROW_HEIGHT}px"
          >
            <!-- Task Name -->
            <button
              class="w-[240px] shrink-0 border-r px-3 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors"
              onclick={() => onTaskClick?.(task)}
            >
              <span class="text-xs font-medium truncate flex-1">{task.title}</span>
              <Badge variant="outline" class="text-[9px] px-1 shrink-0">
                {metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority}
              </Badge>
            </button>

            <!-- Timeline Bar -->
            <div class="flex-1 relative">
              <!-- Day grid lines -->
              {#each days as day, dayIdx}
                <div
                  class="absolute top-0 bottom-0 border-r {day.isToday ? 'bg-primary/5' : day.isWeekend ? 'bg-muted/20' : ''}"
                  style="left: {dayIdx * DAY_WIDTH}px; width: {DAY_WIDTH}px"
                ></div>
              {/each}

              <!-- Task bar -->
              {#if bar}
                <div
                  class="absolute top-1.5 rounded-md h-[calc(100%-12px)] {statusBarColors[task.status] ?? 'bg-gray-400'} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2 overflow-hidden"
                  style="left: {bar.left}px; width: {bar.width}px"
                  title="{task.title} ({task.status})"
                  onclick={() => onTaskClick?.(task)}
                  onkeydown={(e) => { if (e.key === 'Enter') onTaskClick?.(task) }}
                  role="button"
                  tabindex="0"
                >
                  {#if bar.width > 80}
                    <span class="text-[10px] text-white font-medium truncate">{task.title}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
