<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import Calendar from '@/components/ui/calendar.svelte'
  import { CalendarIcon } from 'lucide-svelte'
  import { cn } from '@/lib/utils'
  import { format } from 'date-fns'

  interface Props {
    date?: Date
    canEdit: boolean
    handleDateChange?: (date: Date | undefined) => void
  }

  const { date, canEdit, handleDateChange }: Props = $props()
</script>

<div class="grid gap-2">
  <Label for="due_date">Ngày đến hạn</Label>
  {#if canEdit}
    <Popover>
      <PopoverTrigger
        class={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-start rounded-md border px-3 py-2 text-left text-sm font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          !date && 'text-muted-foreground'
        )}
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {date ? format(date, 'PPP') : 'Chọn ngày'}
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0">
        <Calendar
          selected={date}
          onSelect={handleDateChange}
        />
      </PopoverContent>
    </Popover>
  {:else}
    <div class="p-2 border rounded-md">
      {date ? format(date, 'PPP') : 'Không có hạn'}
    </div>
  {/if}
</div>
