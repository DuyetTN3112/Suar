import React from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface TaskDueDateFieldProps {
  date?: Date
  canEdit: boolean
  handleDateChange?: (date: Date | undefined) => void
}

export function TaskDueDateField({ date, canEdit, handleDateChange }: TaskDueDateFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="due_date">Ngày đến hạn</Label>
      {canEdit ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: vi }) : "Chọn ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              locale={vi}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div className="p-2 border rounded-md">
          {date ? format(date, "PPP", { locale: vi }) : "Không có hạn"}
        </div>
      )}
    </div>
  )
} 