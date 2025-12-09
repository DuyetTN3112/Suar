<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'

  import type { NavCollapsible, NavGroup } from '@/apps/org/shared/components/navigation_types'
  import {
    isNavCollapsible,
    isNavItemActive,
    isNavLink,
    isNavUrlActive,
  } from '@/apps/org/shared/components/navigation_helpers'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface Props {
    navigation: NavGroup[]
    currentUrl: string
    onNavigate: (url: string) => void
  }

  const { navigation, currentUrl, onNavigate }: Props = $props()
  const { t } = $derived(useTranslation())

  let expandedItems = $state<Record<string, boolean>>({})

  function getExpandKey(groupTitle: string, itemTitle: string) {
    return `${groupTitle}::${itemTitle}`
  }

  function getNavLabel(item: { title: string; titleKey?: string; titleParams?: Record<string, string | number | boolean> }) {
    return item.titleKey ? t(item.titleKey, item.titleParams ?? {}, item.title) : item.title
  }

  function isExpanded(groupTitle: string, item: NavCollapsible) {
    const key = getExpandKey(groupTitle, item.title)
    const manualState = expandedItems[key]
    if (manualState !== undefined) {
      return manualState
    }

    return item.items.some((child) => isNavUrlActive(currentUrl, child.url))
  }

  function toggleItem(groupTitle: string, item: NavCollapsible) {
    const key = getExpandKey(groupTitle, item.title)

    expandedItems = {
      ...expandedItems,
      [key]: !isExpanded(groupTitle, item),
    }
  }

  function handleCollapsibleClick(groupTitle: string, item: NavCollapsible) {
    const [singleItem] = item.items
    if (singleItem && item.items.length === 1) {
      onNavigate(singleItem.url)
      return
    }

    toggleItem(groupTitle, item)
  }
</script>

<nav class="flex-1 overflow-y-auto px-3 pb-4">
  {#each navigation as navGroup}
    <div class="mb-4">
      <p class="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {getNavLabel(navGroup)}
      </p>
      <ul class="space-y-0.5">
        {#each navGroup.items as item}
          {#if isNavLink(item)}
            {@const Icon = item.icon}
            <li>
              <button
                class:active={isNavUrlActive(currentUrl, item.url)}
                aria-current={isNavUrlActive(currentUrl, item.url) ? 'page' : undefined}
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isNavUrlActive(currentUrl, item.url) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}"
                type="button"
                onclick={() => {
                  onNavigate(item.url)
                }}
              >
                <span class="grid h-5 w-5 shrink-0 place-items-center">
                  {#if Icon}
                    <Icon class="h-4 w-4" />
                  {/if}
                </span>
                <span class="truncate">{getNavLabel(item)}</span>
              </button>
            </li>
          {:else if isNavCollapsible(item)}
            {@const ParentIcon = item.icon}
            <li
              class={`rounded-xl border px-2 py-2 ${
                isNavItemActive(currentUrl, item)
                  ? 'border-primary/25 bg-primary/5'
                  : 'border-border/70 bg-muted/20'
              }`}
            >
              <button
                type="button"
                aria-expanded={item.items.length > 1 ? isExpanded(navGroup.title, item) : undefined}
                aria-haspopup={item.items.length > 1 ? 'menu' : undefined}
                class="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-sm font-semibold text-foreground"
                onclick={() => {
                  handleCollapsibleClick(navGroup.title, item)
                }}
              >
                <span class="grid h-5 w-5 shrink-0 place-items-center">
                  {#if ParentIcon}
                    <ParentIcon class="h-4 w-4" />
                  {/if}
                </span>
                <span class="min-w-0 flex-1 truncate">{getNavLabel(item)}</span>
                <ChevronRight
                  class={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isExpanded(navGroup.title, item) ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {#if isExpanded(navGroup.title, item)}
                <div class="mt-2 space-y-1 border-l border-border pl-3">
                  {#each item.items as subItem}
                    {@const SubIcon = subItem.icon ?? item.icon}
                    <button
                      class:active={isNavUrlActive(currentUrl, subItem.url)}
                      aria-current={isNavUrlActive(currentUrl, subItem.url) ? 'page' : undefined}
                      class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isNavUrlActive(currentUrl, subItem.url) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}"
                      type="button"
                      onclick={() => {
                        onNavigate(subItem.url)
                      }}
                    >
                      <span class="grid h-5 w-5 shrink-0 place-items-center">
                        {#if SubIcon}
                          <SubIcon class="h-4 w-4" />
                        {/if}
                      </span>
                      <span class="min-w-0 flex-1 whitespace-normal break-words text-left leading-4">{getNavLabel(subItem)}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </li>
          {/if}
        {/each}
      </ul>
    </div>
  {/each}
</nav>
