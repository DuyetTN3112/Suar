<script lang="ts">
  import DropdownMenu from './dropdown_menu.svelte'
  import DropdownMenuTrigger from './dropdown_menu_trigger.svelte'
  import DropdownMenuContent from './dropdown_menu_content.svelte'
  import DropdownMenuGroup from './dropdown_menu_group.svelte'
  import DropdownMenuItem from './dropdown_menu_item.svelte'
  import Button from './button.svelte'
  import { Globe } from 'lucide-svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  type TranslationNamespace = Record<string, unknown>

  interface TranslationPayload {
    messages?: {
      user?: TranslationNamespace
      common?: TranslationNamespace
    }
    user?: TranslationNamespace
    common?: TranslationNamespace
  }

  interface Props {
    locale?: string
    supportedLocales?: string[]
    translations?: TranslationPayload
  }

  const { locale = 'vi', supportedLocales = [], translations }: Props = $props()

  const { t } = useTranslation()

  // Debug log chi tiết
  $effect(() => {
    if (!translations) {
      return
    }

    const hasUser = Boolean(translations.messages?.user || translations.user)
    const hasCommon = Boolean(translations.messages?.common || translations.common)

    if (!hasUser && import.meta.env.DEV) {
      console.warn('[LanguageSwitcher] Missing user namespace in translations')
    }

    if (!hasCommon && import.meta.env.DEV) {
      console.warn('[LanguageSwitcher] Missing common namespace in translations')
    }
  })

  function getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      en: 'English',
      vi: 'Tiếng Việt'
    }
    return languages[code] || code
  }

  function switchLanguage(newLocale: string) {
    const url = new URL(window.location.href)
    url.searchParams.delete('locale')
    url.searchParams.set('locale', newLocale)
    const newUrl = url.toString()
    window.location.href = newUrl
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="icon" class="relative">
      <Globe class="h-4 w-4" />
      <span class="sr-only">{t('settings.language_switcher', {}, 'Chuyển đổi ngôn ngữ')}</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuGroup>
      {#each supportedLocales as code}
        <DropdownMenuItem
          onclick={() => {
            switchLanguage(code)
          }}
          class={locale === code ? 'bg-accent' : ''}
        >
          {getLanguageName(code)}
          {#if locale === code}
            <span class="ml-2 text-xs">✓</span>
          {/if}
        </DropdownMenuItem>
      {/each}
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
