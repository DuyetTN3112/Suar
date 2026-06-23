<script lang="ts">
  import { Check, ChevronsUpDown, Search } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Command from '@/components/ui/command.svelte'
  import CommandEmpty from '@/components/ui/command_empty.svelte'
  import CommandGroup from '@/components/ui/command_group.svelte'
  import CommandInput from '@/components/ui/command_input.svelte'
  import CommandItem from '@/components/ui/command_item.svelte'
  import CommandList from '@/components/ui/command_list.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'

  import { cn } from '$lib/utils-svelte'

  interface Skill {
    id: string
    skill_name: string
    category_code?: string
    aliases?: string[]
  }

  interface Props {
    skills: Skill[]
    value: string
    onSelect?: (skillId: string, skill: Skill) => void
    placeholder?: string
    disabled?: boolean
    class?: string
  }

  let {
    skills,
    value = $bindable(''),
    onSelect,
    placeholder = 'Tìm skill...',
    disabled = false,
    class: className = '',
  }: Props = $props()

  let open = $state(false)
  let search = $state('')

  const selected = $derived(skills.find((s) => s.id === value))

  // Group by category
  const grouped = $derived(() => {
    const q = search.toLowerCase().trim()
    const filtered = q
      ? skills.filter(
          (s) =>
            s.skill_name.toLowerCase().includes(q) ||
            (s.category_code?.toLowerCase().includes(q) ?? false) ||
            (s.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false)
        )
      : skills

    return filtered.reduce<Record<string, Skill[]>>((acc, skill) => {
      const cat = skill.category_code ?? 'other'
      const list = acc[cat] ?? []
      list.push(skill)
      acc[cat] = list
      return acc
    }, {})
  })

  const categoryLabels: Record<string, string> = {
    technical: 'Technical',
    soft: 'Soft Skills',
    delivery: 'Delivery',
    other: 'Other',
  }

  function handleSelect(skill: Skill) {
    value = skill.id
    open = false
    search = ''
    onSelect?.(skill.id, skill)
  }
</script>

<Popover bind:open={open}>
  <PopoverTrigger {disabled}>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      {disabled}
      class={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
    >
      <span class="flex items-center gap-2 truncate">
        {#if selected}
          {#if selected.category_code}
            <span class="shrink-0 inline-block w-2 h-2 rounded-full
              {selected.category_code === 'technical' ? 'bg-blue-500' : selected.category_code === 'soft' ? 'bg-emerald-500' : 'bg-amber-500'}
            "></span>
          {/if}
          {selected.skill_name}
        {:else}
          <Search class="h-4 w-4 opacity-50" />
          {placeholder}
        {/if}
      </span>
      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent class="w-80 p-0" align="start">
    <Command shouldFilter={false}>
      <CommandInput
        bind:value={search}
        placeholder="Tìm theo tên hoặc alias..."
        class="h-9"
      />
      <CommandList>
        {#if Object.keys(grouped()).length === 0}
          <CommandEmpty>Không tìm thấy skill nào.</CommandEmpty>
        {:else}
          {#each Object.entries(grouped()) as [cat, catSkills] (cat)}
            <CommandGroup heading={categoryLabels[cat] ?? cat}>
              {#each catSkills as skill (skill.id)}
                <CommandItem
                  value={skill.id}
                  onSelect={() => { handleSelect(skill); }}
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <Check class={cn('h-4 w-4 shrink-0', value === skill.id ? 'opacity-100' : 'opacity-0')} />
                  <span class="truncate">{skill.skill_name}</span>
                  {#if skill.aliases?.length}
                    <span class="ml-auto text-[10px] text-muted-foreground truncate max-w-20">
                      {skill.aliases[0]}
                    </span>
                  {/if}
                </CommandItem>
              {/each}
            </CommandGroup>
          {/each}
        {/if}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
