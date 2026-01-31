<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Calendar from '@/components/ui/calendar.svelte'
  import { format } from 'date-fns'
  import { CalendarIcon } from 'lucide-svelte'
  import * as Popover from '@/components/ui/popover'
  import { cn } from '@/lib/utils'
  import Button from '@/components/ui/button.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    dueDate?: Date
    onDateChange: (date: Date | undefined) => void
    error?: string
  }

  const { dueDate, onDateChange, error }: Props = $props()
  const { t } = useTranslation()

  let date = $state<Date | undefined>(dueDate)

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
  <Popover.Root>
    <Popover.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="outline"
        class={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground"
        )}
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {date ? format(date, 'PPP') : t('task.select_due_date', {}, 'Chọn ngày')}
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0">
      <Calendar
        bind:value={date}
        onValueChange={handleSelect}
      />
    </Popover.Content>
  </Popover.Root>
  {#if error}
    <p class="text-xs text-red-500">{error}</p>
  {/if}
</div>
