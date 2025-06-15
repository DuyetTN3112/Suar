<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { ArrowRightIcon } from 'lucide-svelte'
  import { useTheme } from '@/stores/theme.svelte'
  import { useSearch } from '@/stores/search.svelte'
  import CommandDialog from '@/components/ui/command_dialog.svelte'
  import CommandEmpty from '@/components/ui/command_empty.svelte'
  import CommandGroup from '@/components/ui/command_group.svelte'
  import CommandInput from '@/components/ui/command_input.svelte'
  import CommandItem from '@/components/ui/command_item.svelte'
  import CommandList from '@/components/ui/command_list.svelte'
  import CommandSeparator from '@/components/ui/command_separator.svelte'
  import ScrollArea from '@/components/ui/scroll_area.svelte'
  import { mainNavigation } from '@/components/navigation.svelte'

  const sidebarData = {
    navGroups: mainNavigation,
  }

  const { setTheme } = useTheme()
  const search = useSearch()

  $effect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        search.toggle()
      }
    }

    document.addEventListener('keydown', down)
    return () => { document.removeEventListener('keydown', down) }
  })

  function runCommand(command: () => unknown) {
    search.close()
    command()
  }

  function handleDialogOpenChange(open: boolean) {
    if (open) {
      search.open()
      return
    }

    search.close()
  }
</script>

<CommandDialog open={$search.isOpen} onOpenChange={handleDialogOpenChange}>
  <CommandInput
    placeholder="Nhập lệnh hoặc tìm kiếm..."
    value={$search.query}
    onValueChange={search.setQuery}
  />
  <CommandList>
    <ScrollArea class="h-72 pr-1">
      <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
      {#each sidebarData.navGroups as group}
        <CommandGroup heading={group.title}>
          {#each group.items as navItem}
            {#if navItem.url}
              <CommandItem
                value={navItem.title}
                onSelect={() => {
                  const targetUrl = navItem.url
                  runCommand(() => {
                    router.visit(targetUrl, {
                      preserveState: true,
                      preserveScroll: true
                    })
                  })
                }}
              >
                <div class="mr-2 flex h-4 w-4 items-center justify-center">
                  <ArrowRightIcon class="text-muted-foreground/80 size-2" />
                </div>
                {navItem.title}
              </CommandItem>
            {:else if Array.isArray(navItem.items)}
              {#each navItem.items as subItem}
                <CommandItem
                  value={subItem.title}
                  onSelect={() => {
                    const targetUrl = subItem.url
                    runCommand(() => {
                      router.visit(targetUrl, {
                        preserveState: true,
                        preserveScroll: true
                      })
                    })
                  }}
                >
                  <div class="mr-2 flex h-4 w-4 items-center justify-center">
                    <ArrowRightIcon class="text-muted-foreground/80 size-2" />
                  </div>
                  {subItem.title}
                </CommandItem>
              {/each}
            {/if}
          {/each}
        </CommandGroup>
      {/each}
      <CommandSeparator />
      <CommandGroup heading="Giao diện">
        <CommandItem
          onSelect={() => { runCommand(() => { setTheme('light') }) }}
          value="Sáng"
        >
          <div class="mr-2 flex h-4 w-4 items-center justify-center">
            <ArrowRightIcon class="text-muted-foreground/80 size-2" />
          </div>
          Chế độ sáng
        </CommandItem>
        <CommandItem
          onSelect={() => { runCommand(() => { setTheme('dark') }) }}
          value="Tối"
        >
          <div class="mr-2 flex h-4 w-4 items-center justify-center">
            <ArrowRightIcon class="text-muted-foreground/80 size-2" />
          </div>
          Chế độ tối
        </CommandItem>
        <CommandItem
          onSelect={() => { runCommand(() => { setTheme('system') }) }}
          value="Hệ thống"
        >
          <div class="mr-2 flex h-4 w-4 items-center justify-center">
            <ArrowRightIcon class="text-muted-foreground/80 size-2" />
          </div>
          Theo hệ thống
        </CommandItem>
      </CommandGroup>
    </ScrollArea>
  </CommandList>
</CommandDialog>
