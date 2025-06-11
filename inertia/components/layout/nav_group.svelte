<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import { ChevronRight } from 'lucide-svelte'
  import { getContext } from 'svelte'
  import Collapsible from '@/components/ui/collapsible.svelte'
  import CollapsibleContent from '@/components/ui/collapsible_content.svelte'
  import CollapsibleTrigger from '@/components/ui/collapsible_trigger.svelte'
  import SidebarGroup from '@/components/ui/sidebar/sidebar_group.svelte'
  import SidebarGroupLabel from '@/components/ui/sidebar/sidebar_group_label.svelte'
  import SidebarMenu from '@/components/ui/sidebar/sidebar_menu.svelte'
  import SidebarMenuButton from '@/components/ui/sidebar/sidebar_menu_button.svelte'
  import SidebarMenuItem from '@/components/ui/sidebar/sidebar_menu_item.svelte'
  import SidebarMenuSub from '@/components/ui/sidebar/sidebar_menu_sub.svelte'
  import SidebarMenuSubButton from '@/components/ui/sidebar/sidebar_menu_sub_button.svelte'
  import SidebarMenuSubItem from '@/components/ui/sidebar/sidebar_menu_sub_item.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { ComponentType, Snippet } from 'svelte'

  interface BaseNavItem {
    title: string
    titleKey?: string
    badge?: string
    icon?: ComponentType
  }

  type NavLink = BaseNavItem & {
    url: string
    items?: never
  }

  type NavCollapsible = BaseNavItem & {
    items: (BaseNavItem & { url: string })[]
    url?: never
  }

  type NavItem = NavCollapsible | NavLink

  interface NavGroupProps {
    title: string
    titleKey?: string
    items: NavItem[]
  }

  const { title, titleKey, items }: NavGroupProps = $props()

  const sidebar = getContext<{ state: string; setOpenMobile: (open: boolean) => void }>('sidebar')
  const { t } = useTranslation()

  let currentUrl = $state(typeof window !== 'undefined' ? window.location.href : '')

  $effect(() => {
    if (typeof window !== 'undefined') {
      currentUrl = window.location.href
    }
  })

  const translatedTitle = $derived(titleKey ? t(titleKey, {}, title) : title)

  // Optimize navigation to maintain SPA behavior and prevent full page reloads
  function handleNavigation(url: string, callback?: () => void) {
    if (!url) return

    router.visit(url, {
      preserveScroll: true,
      preserveState: true,
      onError: (errors) => {
        // Only log in development
        if (import.meta.env.MODE === 'development') {
          console.error('[Navigation] Lỗi khi điều hướng:', errors)
        }
      },
    })

    // Execute callback after navigation (e.g. close mobile sidebar)
    if (callback) {
      callback()
    }
  }

  function checkIsActive(href: string, item: NavItem, mainNav = false): boolean {
    return (
      href === item.url || // /endpoint?search=param
      href.split('?')[0] === item.url || // endpoint
      !!(item as NavCollapsible)?.items?.filter((i) => i.url === href).length || // if child nav is active
      (mainNav &&
        href.split('/')[1] !== '' &&
        href.split('/')[1] === item?.url?.split('/')[1])
    )
  }

  function isNavLink(item: NavItem): item is NavLink {
    return !('items' in item) || !item.items
  }

  function isNavCollapsible(item: NavItem): item is NavCollapsible {
    return 'items' in item && Array.isArray(item.items) && item.items.length > 0
  }
</script>

{#snippet NavBadge(badgeContent: string)}
  <Badge
    variant="secondary"
    class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
  >
    {badgeContent}
  </Badge>
{/snippet}

<SidebarGroup>
  <SidebarGroupLabel>{translatedTitle}</SidebarGroupLabel>
  <SidebarMenu>
    {#each items as item}
      {#if isNavLink(item)}
        <!-- SidebarMenuLink -->
        {@const itemTranslatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={checkIsActive(currentUrl, item)}
            tooltip={itemTranslatedTitle}
          >
            <Link
              href={item.url}
              onclick={(e: MouseEvent) => {
                e.preventDefault()
                handleNavigation(item.url, () => { sidebar?.setOpenMobile?.(false) })
              }}
              class="flex items-center gap-2 w-full"
            >
              {#if item.icon}
                {@const IconComponent = item.icon}
                <IconComponent class="h-4 w-4" />
              {/if}
              <span>{itemTranslatedTitle}</span>
              {#if item.badge}
                {@render NavBadge(item.badge)}
              {/if}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      {:else if isNavCollapsible(item)}
        {#if sidebar?.state === 'collapsed'}
          <!-- SidebarMenuCollapsedDropdown -->
          {@const itemTranslatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <SidebarMenuButton
                class="w-full"
                tooltip={itemTranslatedTitle}
              >
                {#if item.icon}
                  {@const IconComponent = item.icon}
                  <IconComponent class="h-4 w-4" />
                {/if}
                <span>{itemTranslatedTitle}</span>
                {#if item.badge}
                  {@render NavBadge(item.badge)}
                {/if}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="center"
              sideOffset={12}
              class="min-w-40 border border-sidebar-border bg-sidebar"
            >
              {#each item.items as subItem}
                {@const subTranslatedTitle = subItem.titleKey ? t(subItem.titleKey, {}, subItem.title) : subItem.title}
                <DropdownMenuItem>
                  <Link
                    href={subItem.url}
                    onclick={(e: MouseEvent) => {
                      e.preventDefault()
                      handleNavigation(subItem.url, () => { sidebar?.setOpenMobile?.(false) })
                    }}
                    class="flex items-center gap-2 w-full"
                  >
                    {#if subItem.icon}
                      {@const SubIconComponent = subItem.icon}
                      <SubIconComponent class="h-4 w-4" />
                    {/if}
                    <span>{subTranslatedTitle}</span>
                    {#if subItem.badge}
                      {@render NavBadge(subItem.badge)}
                    {/if}
                  </Link>
                </DropdownMenuItem>
              {/each}
            </DropdownMenuContent>
          </DropdownMenu>
        {:else}
          <!-- SidebarMenuCollapsible -->
          {@const itemTranslatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title}
          <Collapsible
            defaultOpen={checkIsActive(currentUrl, item, true)}
            class="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger>
                <SidebarMenuButton tooltip={itemTranslatedTitle}>
                  {#if item.icon}
                    {@const IconComponent = item.icon}
                    <IconComponent class="h-4 w-4" />
                  {/if}
                  <span>{itemTranslatedTitle}</span>
                  {#if item.badge}
                    {@render NavBadge(item.badge)}
                  {/if}
                  <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent class="CollapsibleContent">
                <SidebarMenuSub>
                  {#each item.items as subItem}
                    {@const subTranslatedTitle = subItem.titleKey ? t(subItem.titleKey, {}, subItem.title) : subItem.title}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={checkIsActive(currentUrl, subItem)}
                      >
                        <Link
                          href={subItem.url}
                          onclick={(e: MouseEvent) => {
                            e.preventDefault()
                            handleNavigation(subItem.url, () => { sidebar?.setOpenMobile?.(false) })
                          }}
                          class="flex items-center gap-2 w-full"
                        >
                          {#if subItem.icon}
                            {@const SubIconComponent = subItem.icon}
                            <SubIconComponent class="h-4 w-4" />
                          {/if}
                          <span>{subTranslatedTitle}</span>
                          {#if subItem.badge}
                            {@render NavBadge(subItem.badge)}
                          {/if}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  {/each}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        {/if}
      {/if}
    {/each}
  </SidebarMenu>
</SidebarGroup>
