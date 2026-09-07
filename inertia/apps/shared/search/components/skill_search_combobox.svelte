<script lang="ts">
  import { Search, Loader2 } from 'lucide-svelte'

  export interface SkillOption {
    id: string
    skillName: string
    skillCode: string
    categoryCode: string
    displayType: string
  }

  interface Props {
    selectedSkillId?: string | null
    onSelect?: (skill: SkillOption | null) => void
    placeholder?: string
    disabled?: boolean
  }

  let {
    selectedSkillId = $bindable(null),
    onSelect,
    placeholder = 'Search skills...',
    disabled = false,
  }: Props = $props()

  let query = $state('')
  let options = $state<SkillOption[]>([])
  let loading = $state(false)
  let open = $state(false)

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  async function fetchSkills(searchQuery: string) {
    if (!searchQuery.trim()) {
      options = []
      loading = false
      return
    }

    loading = true
    try {
      const response = await fetch(`/api/v1/skills/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = (await response.json()) as { skills?: SkillOption[] }
        options = data.skills ?? []
      } else {
        options = []
      }
    } catch {
      options = []
    } finally {
      loading = false
    }
  }

  function handleInput(event: Event) {
    const value = (event.target as HTMLInputElement).value
    query = value
    open = true

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void fetchSkills(value)
    }, 200)
  }

  function handleSelect(skill: SkillOption) {
    selectedSkillId = skill.id
    query = skill.skillName
    open = false
    onSelect?.(skill)
  }

  function handleClear() {
    selectedSkillId = null
    query = ''
    open = false
    onSelect?.(null)
  }
</script>

<div class="relative w-full">
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <input
      type="text"
      value={query}
      oninput={handleInput}
      onfocus={() => { open = true }}
      {placeholder}
      {disabled}
      class="h-10 w-full rounded-md border border-border bg-background pl-9 pr-8 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
    {#if loading}
      <Loader2 class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
    {:else if query}
      <button
        type="button"
        onclick={handleClear}
        class="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Clear skill selection"
      >
        ×
      </button>
    {/if}
  </div>

  {#if open && (options.length > 0 || (query.trim() && !loading))}
    <div class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-lg">
      {#if options.length > 0}
        {#each options as option (option.id)}
          <button
            type="button"
            onclick={() => handleSelect(option)}
            class="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <div>
              <span class="font-medium text-foreground">{option.skillName}</span>
              <span class="ml-2 text-xs text-muted-foreground">({option.categoryCode})</span>
            </div>
            <span class="text-[10px] font-mono text-muted-foreground">{option.skillCode}</span>
          </button>
        {/each}
      {:else}
        <div class="px-3 py-2 text-sm text-muted-foreground">No skills found.</div>
      {/if}
    </div>
  {/if}
</div>
