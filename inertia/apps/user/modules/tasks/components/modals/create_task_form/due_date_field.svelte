<script lang="ts">
  import { format } from 'date-fns'
  import { CalendarIcon } from 'lucide-svelte'

  import Calendar from '@/apps/user/shared/ui/calendar.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Popover from '@/apps/user/shared/ui/popover.svelte'
  import PopoverContent from '@/apps/user/shared/ui/popover_content.svelte'
  import PopoverTrigger from '@/apps/user/shared/ui/popover_trigger.svelte'
  import { cn } from '@/apps/user/shared/lib/utils'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { dateFnsLocale } from '@/apps/user/shared/lib/date_locale'

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
  <Label for="due-date-field">
    {t('task.due_date', {}, 'Due date')}
    <span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
  </Label>
  <Popover>
    <PopoverTrigger
      id="due-date-field"
      data-testid="due-date-trigger"
      aria-invalid={error ? 'true' : undefined}
      aria-required="true"
      aria-describedby={error ? 'due_date-error' : undefined}
      class={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-start rounded-md border px-3 py-2 text-left text-sm font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        !date && 'text-muted-foreground',
        error && 'border-destructive'
      )}
    >
      <CalendarIcon class="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP', { locale: dateFnsLocale() }) : t('task.select_due_date', {}, 'Select date')}
    </PopoverTrigger>
    <PopoverContent side="top" sideOffset={8} class="z-[100] w-auto p-0" data-testid="due-date-popover">
      <Calendar
        selected={date}
        onSelect={handleSelect}
      />
    </PopoverContent>
  </Popover>
  {#if error}
    <p id="due_date-error" class="text-xs font-medium text-destructive" role="alert">{error}</p>
  {/if}
</div>
