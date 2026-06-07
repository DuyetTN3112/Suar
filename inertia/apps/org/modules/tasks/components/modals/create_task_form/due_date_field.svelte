<script lang="ts">
  import { format } from 'date-fns'
  import { CalendarIcon } from 'lucide-svelte'

  import Calendar from '@/apps/org/shared/ui/calendar.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Popover from '@/apps/org/shared/ui/popover.svelte'
  import PopoverContent from '@/apps/org/shared/ui/popover_content.svelte'
  import PopoverTrigger from '@/apps/org/shared/ui/popover_trigger.svelte'
  import { cn } from '@/apps/org/shared/lib/utils'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { dateFnsLocale } from '@/apps/org/shared/lib/date_locale'

  interface Props {
    dueDate?: Date
    onDateChange: (date: Date | undefined) => void
    error?: string
  }

  const { dueDate, onDateChange, error }: Props = $props()
  const { t } = useTranslation()

  let date = $state<Date | undefined>(undefined)

  $effect(() => {
    date = dueDate
  })

  const handleSelect = (newDate: Date | undefined) => {
    date = newDate
    onDateChange(newDate)
  }
</script>

<div class="grid gap-2">
  <Label>{t('task.due_date', {}, 'Due date')}</Label>
  <Popover>
    <PopoverTrigger
      class={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-start rounded-md border px-3 py-2 text-left text-sm font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        !date && 'text-muted-foreground'
      )}
    >
      <CalendarIcon class="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP', { locale: dateFnsLocale() }) : t('task.select_due_date', {}, 'Select date')}
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar
        selected={date}
        onSelect={handleSelect}
      />
    </PopoverContent>
  </Popover>
  {#if error}
    <p class="text-xs text-destructive">{error}</p>
  {/if}
</div>
