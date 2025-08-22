<script lang="ts">
  import { Search } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  import Input from '@/components/ui/input.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface TasksFiltersProps {
    filters: {
      status?: string
      priority?: string
      label?: string
      search?: string
      assigned_to?: string
    }
    metadata: {
      statuses: { value: string; label: string; color: string }[]
      labels: { value: string; label: string; color: string }[]
      priorities: { value: string; label: string; color: string }[]
    }
    onSearch: (query: string) => void
    onStatusChange: (status: string) => void
    onPriorityChange: (priority: string) => void
    onTabChange: (tab: string) => void
    searchQuery: string
    selectedStatus: string
    selectedPriority: string
    activeTab: string
    children: Snippet
  }

  const {
    metadata,
    onSearch,
    onStatusChange,
    onPriorityChange,
    onTabChange,
    selectedStatus,
    selectedPriority,
    activeTab,
    children,
    searchQuery,
  }: TasksFiltersProps = $props()

  const { t } = useTranslation()
  let localSearchQuery = $state('')
  let searchTimer: number | null = null

  $effect(() => {
    localSearchQuery = searchQuery
  })

  $effect(() => {
    if (searchTimer) clearTimeout(searchTimer)

    searchTimer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearch(localSearchQuery)
      }
    }, 300) as unknown as number

    return () => {
      if (searchTimer) clearTimeout(searchTimer)
    }
  })

  function handleSearchChange(e: Event) {
    const target = e.target as HTMLInputElement
    localSearchQuery = target.value
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      onSearch(localSearchQuery)
    }
  }

  function handleSearchClick() {
    onSearch(localSearchQuery)
  }
</script>

<div class="flex flex-col space-y-1">
  <Tabs value={activeTab} onValueChange={onTabChange}>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
      <div class="flex items-center gap-2">
        <div class="relative">
          <Input
            placeholder={t('task.search', {}, 'Tìm nhiệm vụ...')}
            value={localSearchQuery}
            oninput={handleSearchChange}
            onkeyup={handleKeyPress}
            class="w-full sm:w-70 pl-8 h-7 text-sm"
          />
          <button
            class="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
            onclick={handleSearchClick}
            type="button"
            aria-label="Search"
          >
            <Search class="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <TabsList class="h-7">
          <TabsTrigger value="all" class="text-xs px-3 py-0.5">{t('common.all', {}, 'Tất cả')}</TabsTrigger>
          <TabsTrigger value="pending" class="text-xs px-3 py-0.5">{t('task.status_todo', {}, 'Đang chờ')}</TabsTrigger>
          <TabsTrigger value="completed" class="text-xs px-3 py-0.5">{t('task.status_done', {}, 'Đã hoàn thành')}</TabsTrigger>
        </TabsList>
      </div>

      <div class="flex gap-2">
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger class="w-30 h-7 text-xs" placeholder={t('task.status', {}, 'Trạng thái')} />
          <SelectContent>
            <SelectItem value="all">{t('common.all', {}, 'Tất cả')}</SelectItem>
            {#each metadata.statuses as status}
              <SelectItem value={status.value}>
                {status.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>

        <Select value={selectedPriority} onValueChange={onPriorityChange}>
          <SelectTrigger class="w-30 h-7 text-xs" placeholder={t('task.priority', {}, 'Ưu tiên')} />
          <SelectContent>
            <SelectItem value="all">{t('common.all', {}, 'Tất cả')}</SelectItem>
            {#each metadata.priorities as priority}
              <SelectItem value={priority.value}>
                {priority.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    </div>

    <TabsContent value={activeTab} class="pt-0 mt-0">
      {@render children()}
    </TabsContent>
  </Tabs>
</div>
