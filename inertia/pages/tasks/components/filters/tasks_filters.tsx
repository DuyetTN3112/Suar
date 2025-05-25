import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

interface TasksFiltersProps {
  filters: {
    status?: string
    priority?: string
    label?: string
    search?: string
    assigned_to?: string
  }
  metadata: {
    statuses: Array<{ id: number; name: string; color: string }>
    labels: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
  }
  onSearch: (query: string) => void
  onStatusChange: (status: string) => void
  onPriorityChange: (priority: string) => void
  onTabChange: (tab: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedStatus: string
  selectedPriority: string
  activeTab: string
  children: ReactNode
}

export function TasksFilters({

  metadata,
  onSearch,
  onStatusChange,
  onPriorityChange,
  onTabChange,
  searchQuery,
  selectedStatus,
  selectedPriority,
  activeTab,
  children
}: TasksFiltersProps) {
  const { t } = useTranslation()
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Xử lý debounce cho search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedQuery !== searchQuery) {
        onSearch(debouncedQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedQuery, onSearch]);

  // Xử lý thay đổi giá trị tìm kiếm
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedQuery(e.target.value);
  };

  // Xử lý khi nhấn Enter trong ô tìm kiếm
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(debouncedQuery);
    }
  };

  // Xử lý khi click vào biểu tượng tìm kiếm
  const handleSearchClick = () => {
    onSearch(debouncedQuery);
  };

  return (
    <div className="flex flex-col space-y-1">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder={t('task.search', {}, 'Tìm nhiệm vụ...')}
                value={debouncedQuery}
                onChange={handleSearchChange}
                onKeyUp={handleKeyPress}
                className="w-full sm:w-[280px] pl-8 h-7 text-sm"
              />
              <div
                className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                onClick={handleSearchClick}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-xs px-3 py-0.5">{t('common.all', {}, 'Tất cả')}</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3 py-0.5">{t('task.status_todo', {}, 'Đang chờ')}</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-3 py-0.5">{t('task.status_done', {}, 'Đã hoàn thành')}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue placeholder={t('task.status', {}, 'Trạng thái')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', {}, 'Tất cả')}</SelectItem>
                {metadata.statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id.toString()}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={onPriorityChange}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue placeholder={t('task.priority', {}, 'Ưu tiên')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', {}, 'Tất cả')}</SelectItem>
                {metadata.priorities.map((priority) => (
                  <SelectItem key={priority.id} value={priority.id.toString()}>
                    {priority.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="pt-0 mt-0">
          {children}
        </TabsContent>
      </Tabs>
    </div>
  )
}
