import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useTranslation from "@/hooks/use_translation"

interface DatePickerProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePicker({ date, onSelect, disabled, placeholder, className }: DatePickerProps) {
  const { t } = useTranslation()
  
  // Format date to local string
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDate(date) : placeholder || t('task.select_due_date', {}, 'Chọn ngày')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
        />
      </PopoverContent>
    </Popover>
  )
} 