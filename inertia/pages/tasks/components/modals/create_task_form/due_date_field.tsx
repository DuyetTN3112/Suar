import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TaskFormDueDateFieldProps {
  dueDate?: Date
  onDateChange: (date: Date | undefined) => void
  error?: string
}

export function TaskFormDueDateField({
  dueDate,
  onDateChange,
  error
}: TaskFormDueDateFieldProps) {
  const [date, setDate] = useState<Date | undefined>(dueDate)
  
  // Sync local state with prop
  useEffect(() => {
    setDate(dueDate)
  }, [dueDate])
  
  // Handle calendar date selection
  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    onDateChange(newDate)
  }
  
  return (
    <div className="grid gap-2">
      <Label>Ngày đến hạn</Label>
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
            {date ? format(date, 'PPP', { locale: vi }) : "Chọn ngày"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
} 