<script lang="ts">
  import { Search } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  import type { FilterConfig, FilterOption, FilterValue } from './data_table_filters_types'

  import Input from '@/apps/admin/shared/ui/input.svelte'
  import Avatar from '@/apps/admin/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/admin/shared/ui/avatar_fallback.svelte'
  import AvatarImage from '@/apps/admin/shared/ui/avatar_image.svelte'
  import Select from '@/apps/admin/shared/ui/select.svelte'
  import SelectContent from '@/apps/admin/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/admin/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/admin/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/admin/shared/ui/select_value.svelte'
  import DropdownMenu from '@/apps/admin/shared/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/apps/admin/shared/ui/dropdown_menu_content.svelte'
  import DropdownMenuTrigger from '@/apps/admin/shared/ui/dropdown_menu_trigger.svelte'
  import DropdownMenuCheckboxItem from '@/apps/admin/shared/ui/dropdown_menu_checkbox_item.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Tabs from '@/apps/admin/shared/ui/tabs.svelte'
  import TabsList from '@/apps/admin/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/admin/shared/ui/tabs_trigger.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface DataTableFiltersProps {
    filters: FilterConfig[]
    values: Record<string, FilterValue>
    onFilterChange: (key: string, value: string) => void
    children?: Snippet
  }

  const {
    filters,
    values,
    onFilterChange,
    children,
  }: DataTableFiltersProps = $props()
  
  // Need local state for text input to debounce
  let searchQueries: Record<string, string> = $state({})
  let searchTimers: Record<string, number> = {}
  const { t } = useTranslation()

  $effect(() => {
    // Sync external values to local search queries
    for (const f of filters) {
      if (f.type === 'search' && values[f.key] !== undefined) {
        const nextValue = stringValue(values[f.key])
        if (searchQueries[f.key] !== nextValue) {
          searchQueries[f.key] = nextValue
        }
      }
    }
  })

  function handleSearchChange(key: string, value: string) {
    searchQueries[key] = value
    if (searchTimers[key]) clearTimeout(searchTimers[key])
    
    searchTimers[key] = setTimeout(() => {
      onFilterChange(key, value)
    }, 300) as unknown as number
  }

  function handleKeyPress(e: KeyboardEvent, key: string) {
    if (e.key === 'Enter') {
      onFilterChange(key, searchQueries[key] ?? '')
    }
  }

  function stringValue(value: FilterValue | FilterConfig['defaultValue']): string {
    if (Array.isArray(value)) return value.join(',')
    return value ?? ''
  }

  function selectedFilterValues(value: FilterValue, defaultValue: FilterConfig['defaultValue']): string[] {
    const rawValue = value ?? defaultValue
    if (Array.isArray(rawValue)) return rawValue.filter(Boolean)
    if (typeof rawValue === 'string') return rawValue.split(',').filter(Boolean)
    return []
  }

  function findOption(options: FilterOption[] | undefined, value: string): FilterOption | null {
    return options?.find((option) => option.value === value) ?? null
  }
</script>

<div class="w-full relative group filter-bar-wrapper">
  <div class="flex flex-wrap items-center gap-2.5 p-1.5 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-[1.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300">
    
    <!-- Search Inputs -->
    {#each filters.filter(f => f.type === 'search') as filter}
      <div class="relative min-w-[200px] flex-1 max-w-md shrink-0">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={filter.placeholder || filter.label || t('common.search', {}, 'Search...')}
          class="pl-9 h-9 border-none bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 focus:bg-background rounded-full text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
          value={searchQueries[filter.key] || stringValue(values[filter.key])}
          oninput={(e: Event) => handleSearchChange(filter.key, (e.target as HTMLInputElement).value)}
          onkeyup={(e: KeyboardEvent) => handleKeyPress(e, filter.key)}
        />
      </div>
    {/each}

    <!-- Tabs -->
    {#each filters.filter(f => f.type === 'tabs') as filter}
      <div class="flex items-center shrink-0">
        <Tabs value={stringValue(values[filter.key]) || stringValue(filter.defaultValue) || 'all'} onValueChange={(value: string) => onFilterChange(filter.key, value)}>
          <TabsList class="h-9 bg-black/5 dark:bg-white/10 rounded-full p-1 border border-black/5 dark:border-white/5">
            {#each filter.options || [] as option}
              <TabsTrigger value={option.value} class="rounded-full h-7 px-3.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                {option.label}
              </TabsTrigger>
            {/each}
          </TabsList>
        </Tabs>
      </div>
    {/each}

    <!-- Selects -->
    {#each filters.filter(f => f.type === 'select') as filter}
      <div class="shrink-0">
        <Select value={stringValue(values[filter.key]) || stringValue(filter.defaultValue) || 'all'} onValueChange={(value: string) => onFilterChange(filter.key, value)}>
          <SelectTrigger class="w-auto min-w-[120px] max-w-[180px] h-9 text-xs bg-background hover:bg-background/80 border border-border/60 rounded-full transition-all text-left justify-start shadow-sm hover:shadow">
            {@const selectedValue = stringValue(values[filter.key])}
            {@const opt = findOption(filter.options, selectedValue)}
            {#if selectedValue && opt?.hasAvatar}
              <div class="flex items-center gap-2 w-full truncate">
                <Avatar class="h-5 w-5 shrink-0">
                  {#if opt.avatarUrl}
                    <AvatarImage src={opt.avatarUrl} alt={opt.label} />
                  {/if}
                  <AvatarFallback class="text-[10px] bg-primary/10 text-primary">{opt.label.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span class="truncate">{opt.label}</span>
              </div>
            {:else}
              <SelectValue placeholder={filter.placeholder || filter.label} />
            {/if}
          </SelectTrigger>
          <SelectContent>
            {#each filter.options || [] as option}
              <SelectItem value={option.value}>
                {#if option.hasAvatar}
                  <div class="flex items-center gap-2">
                    <Avatar class="h-5 w-5 shrink-0">
                      {#if option.avatarUrl}
                        <AvatarImage src={option.avatarUrl} alt={option.label} />
                      {/if}
                      <AvatarFallback class="text-[10px] bg-primary/10 text-primary">
                        {option.label.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span class="truncate">{option.label}</span>
                  </div>
                {:else}
                  {option.label}
                {/if}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    {/each}

    <!-- Multi Selects -->
    {#each filters.filter(f => f.type === 'multi_select') as filter}
      {@const selectedValues = selectedFilterValues(values[filter.key], filter.defaultValue)}
      <div class="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger class="w-auto min-w-[120px] max-w-[200px] h-9 text-xs bg-background hover:bg-background/80 border border-border/60 rounded-full transition-all text-left flex items-center justify-between px-3 shadow-sm hover:shadow focus:outline-none">
            <div class="flex items-center gap-1.5 truncate">
              <span class="truncate text-muted-foreground">{filter.label || filter.placeholder}</span>
              {#if selectedValues.length > 0}
                <div class="w-[1px] h-3 bg-border mx-0.5"></div>
                <Badge class="h-4 px-1.5 py-0 text-[10px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-0">
                  {selectedValues.length}
                </Badge>
                <span class="truncate ml-0.5 text-foreground font-medium">
                  {#if selectedValues.length === 1}
                    {filter.options?.find(o => o.value === selectedValues[0])?.label || selectedValues[0]}
                  {:else}
                    {t('common.selected', {}, 'selected')}
                  {/if}
                </span>
              {/if}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[220px] max-h-[300px] overflow-y-auto">
            {#each filter.options || [] as option}
              <DropdownMenuCheckboxItem 
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) => {
                   const newVals = checked 
                     ? [...selectedValues, option.value]
                     : selectedValues.filter((value) => value !== option.value)
                   onFilterChange(filter.key, newVals.join(','))
                }}
              >
                {#if option.hasAvatar}
                  <div class="flex items-center gap-2">
                    <Avatar class="h-5 w-5 shrink-0">
                      {#if option.avatarUrl}
                        <AvatarImage src={option.avatarUrl} alt={option.label} />
                      {/if}
                      <AvatarFallback class="text-[10px] bg-primary/10 text-primary">
                        {option.label.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span class="truncate">{option.label}</span>
                  </div>
                {:else}
                  {option.label}
                {/if}
              </DropdownMenuCheckboxItem>
            {/each}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/each}

    <!-- Dates -->
    {#each filters.filter(f => f.type === 'date_range') as filter}
      <div class="shrink-0 flex items-center gap-2 bg-background hover:bg-background/80 border border-border/60 rounded-full h-9 px-3 shadow-sm hover:shadow transition-all group/date">
        <span class="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground group-hover/date:text-foreground transition-colors shrink-0">{filter.label}</span>
        <Input 
          type="date" 
          class="h-6 text-xs w-auto min-w-[110px] max-w-[120px] border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-muted-foreground focus:text-foreground transition-colors shrink-0" 
          value={stringValue(values[`${filter.key}_start`])}
          onchange={(e: Event) => onFilterChange(`${filter.key}_start`, (e.target as HTMLInputElement).value)}
        />
        <span class="text-muted-foreground/30 font-light shrink-0">-</span>
        <Input 
          type="date" 
          class="h-6 text-xs w-auto min-w-[110px] max-w-[120px] border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-muted-foreground focus:text-foreground transition-colors shrink-0" 
          value={stringValue(values[`${filter.key}_end`])}
          onchange={(e: Event) => onFilterChange(`${filter.key}_end`, (e.target as HTMLInputElement).value)}
        />
      </div>
    {/each}

    <!-- Children (Clear Button etc) -->
    {#if children}
      <div class="ml-auto shrink-0 flex items-center pr-1 pl-2">
        {@render children()}
      </div>
    {/if}

  </div>
</div>
