<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Button from '@/components/ui/button.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import Calendar from '@/components/ui/calendar.svelte'
  import { CalendarIcon } from 'lucide-svelte'
  import { cn } from '@/lib/utils'
  import { format } from 'date-fns'
  import { vi } from 'date-fns/locale'

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
      <PopoverTrigger asChild let:builder>
        <Button
          variant="outline"
          class={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          builders={[builder]}
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: vi }) : "Chọn ngày"}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          locale={vi}
        />
      </PopoverContent>
    </Popover>
  {:else}
    <div class="p-2 border rounded-md">
      {date ? format(date, "PPP", { locale: vi }) : "Không có hạn"}
    </div>
  {/if}
</div>
