<script lang="ts">
  import { Check, Moon, Sun, Laptop } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import DropdownMenu from '@/apps/user/shared/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/apps/user/shared/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/apps/user/shared/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/apps/user/shared/ui/dropdown_menu_trigger.svelte'
  import Tooltip from '@/apps/user/shared/ui/tooltip.svelte'
  import TooltipContent from '@/apps/user/shared/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/apps/user/shared/ui/tooltip_trigger.svelte'
  import { THEME_OPTIONS } from '@/apps/user/shared/constants/theme'
  import { theme, type Theme } from '@/apps/user/shared/stores/theme.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import { cn } from '$lib/utils-svelte'

  let currentTheme: Theme = $state('light')
  const { t } = useTranslation()

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

  function themeOptionLabel(value: Theme) {
    if (value === 'light') return t('settings.settings.theme_light', {}, 'Light')
    if (value === 'dark') return t('settings.settings.theme_dark', {}, 'Dark')
    return t('settings.settings.theme_system', {}, 'System')
  }
</script>

<Tooltip>
  <TooltipTrigger>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" class="scale-95 rounded-full hover:bg-accent hover:text-accent-foreground">
          <Sun class="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon class="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span class="sr-only">{t('common.change_theme', {}, 'Change theme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-[180px]">
        <DropdownMenuItem onclick={() => { setThemeValue('light'); }} class="cursor-pointer">
          <Sun class="mr-2 h-4 w-4" />
          <span>{themeOptionLabel(THEME_OPTIONS[0].value)}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'light' && 'invisible')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onclick={() => { setThemeValue('dark'); }} class="cursor-pointer">
          <Moon class="mr-2 h-4 w-4" />
          <span>{themeOptionLabel(THEME_OPTIONS[1].value)}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'dark' && 'invisible')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onclick={() => { setThemeValue('system'); }} class="cursor-pointer">
          <Laptop class="mr-2 h-4 w-4" />
          <span>{themeOptionLabel(THEME_OPTIONS[2].value)}</span>
          <Check
            size={14}
            class={cn('ml-auto', currentTheme !== 'system' && 'invisible')}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>{t('common.change_theme', {}, 'Change theme')}</p>
  </TooltipContent>
</Tooltip>
