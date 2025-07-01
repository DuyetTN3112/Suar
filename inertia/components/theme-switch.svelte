<script lang="ts">
  import { Check, Moon, Sun, Laptop } from 'lucide-svelte'
  import { cn } from '$lib/utils-svelte'
  import { theme, type Theme } from '@/stores/theme.svelte'
  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import Tooltip from '@/components/ui/tooltip.svelte'
  import TooltipTrigger from '@/components/ui/tooltip_trigger.svelte'
  import TooltipContent from '@/components/ui/tooltip_content.svelte'
  import { THEME_OPTIONS } from '@/constants/theme'

  let currentTheme: Theme = $state('light')

  // Subscribe to theme store
  $effect(() => {
    const unsubscribe = theme.subscribe(value => {
      currentTheme = value
    })
    return unsubscribe
  })

  function setThemeValue(value: Theme) {
    theme.set(value)
  }
</script>

<Tooltip>
  <TooltipTrigger>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" class="scale-95 rounded-full hover:bg-accent hover:text-accent-foreground">
          <Sun class="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon class="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span class="sr-only">Chuyển đổi giao diện</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-[180px]">
        <DropdownMenuItem onclick={() => { setThemeValue('light'); }} class="cursor-pointer">
          <Sun class="mr-2 h-4 w-4" />
          <span>{THEME_OPTIONS[0].label}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'light' && 'invisible')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onclick={() => { setThemeValue('dark'); }} class="cursor-pointer">
          <Moon class="mr-2 h-4 w-4" />
          <span>{THEME_OPTIONS[1].label}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'dark' && 'invisible')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onclick={() => { setThemeValue('system'); }} class="cursor-pointer">
          <Laptop class="mr-2 h-4 w-4" />
          <span>{THEME_OPTIONS[2].label}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'system' && 'invisible')}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>Thay đổi giao diện</p>
  </TooltipContent>
</Tooltip>
