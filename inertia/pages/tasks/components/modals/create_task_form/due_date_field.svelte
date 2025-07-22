<script lang="ts">
  import { format } from 'date-fns'
  import { CalendarIcon } from 'lucide-svelte'

  import Calendar from '@/components/ui/calendar.svelte'
  import Label from '@/components/ui/label.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import { cn } from '@/lib/utils'
  import { useTranslation } from '@/stores/translation.svelte'

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
  <Label>{t('task.due_date', {}, 'Ngày đến hạn')}</Label>
  <Popover>
    <PopoverTrigger
      class={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-start rounded-md border px-3 py-2 text-left text-sm font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        !date && 'text-muted-foreground'
      )}
    >
      <CalendarIcon class="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP') : t('task.select_due_date', {}, 'Chọn ngày')}
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar
        selected={date}
        onSelect={handleSelect}
      />
    </PopoverContent>
  </Popover>
  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>
