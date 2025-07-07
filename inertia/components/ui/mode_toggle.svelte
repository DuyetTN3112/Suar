<script lang="ts">
  import { Sun, Moon, Check } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import { cn } from '@/lib/utils'
  import { theme, type Theme } from '@/stores/theme.svelte'


  let currentTheme = $state<Theme>('light')

  // Subscribe to theme store
  const unsubscribe = theme.subscribe((value) => {
    currentTheme = value
  })

  $effect(() => {
    return () => {
      unsubscribe()
    }
  })

  function setTheme(newTheme: Theme) {
    theme.set(newTheme)
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" class="scale-95 rounded-full" {...props}>
        <Sun
          class="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        />
        <Moon
          class="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        />
        <span class="sr-only">Chuyển đổi giao diện</span>
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onclick={() => { setTheme('light'); }}>
      Sáng
      <Check size={14} class={cn('ml-auto', currentTheme !== 'light' && 'hidden')} />
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => { setTheme('dark'); }}>
      Tối
      <Check size={14} class={cn('ml-auto', currentTheme !== 'dark' && 'hidden')} />
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => { setTheme('system'); }}>
      Hệ thống
      <Check size={14} class={cn('ml-auto', currentTheme !== 'system' && 'hidden')} />
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
