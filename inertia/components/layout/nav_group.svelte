<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ChevronRight } from 'lucide-svelte'
  import { getContext } from 'svelte'

  import type { LucideIconComponent } from '@/components/lucide_icon_map'
  import Badge from '@/components/ui/badge.svelte'
  import Collapsible from '@/components/ui/collapsible.svelte'
  import CollapsibleContent from '@/components/ui/collapsible_content.svelte'
  import CollapsibleTrigger from '@/components/ui/collapsible_trigger.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import SidebarGroup from '@/components/ui/sidebar/sidebar_group.svelte'
  import SidebarGroupLabel from '@/components/ui/sidebar/sidebar_group_label.svelte'
  import SidebarMenu from '@/components/ui/sidebar/sidebar_menu.svelte'
  import SidebarMenuButton from '@/components/ui/sidebar/sidebar_menu_button.svelte'
  import SidebarMenuItem from '@/components/ui/sidebar/sidebar_menu_item.svelte'
  import SidebarMenuSub from '@/components/ui/sidebar/sidebar_menu_sub.svelte'
  import SidebarMenuSubButton from '@/components/ui/sidebar/sidebar_menu_sub_button.svelte'
  import SidebarMenuSubItem from '@/components/ui/sidebar/sidebar_menu_sub_item.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface BaseNavItem {
    title: string
    titleKey?: string
    badge?: string
    icon?: LucideIconComponent
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

  const currentUrl = $derived(page.url)

  const translatedTitle = $derived(titleKey ? t(titleKey, {}, title) : title)

  // Optimize navigation to maintain SPA behavior and prevent full page reloads
  function handleNavigation(url: string, callback?: () => void) {
    if (!url) return

    const normalizedCurrent = currentUrl.split('?')[0]
    const normalizedTarget = url.split('?')[0]
    if (normalizedCurrent === normalizedTarget) {
      callback?.()
      return
    }

    router.visit(url, {
      preserveScroll: true,
      preserveState: false,
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
    const normalizedHref = href.split('?')[0]

    if (isNavLink(item)) {
      if (href === item.url || normalizedHref === item.url) {
        return true
      }

      if (!mainNav) {
        return false
      }

      const hrefSegment = href.split('/')[1]
      const itemSegment = item.url.split('/')[1]

      return hrefSegment !== '' && hrefSegment === itemSegment
    }

    return item.items.some((child) => child.url === normalizedHref)
  }

  function isNavLink(item: NavItem): item is NavLink {
    return !('items' in item) || !item.items
  }

  function isNavCollapsible(item: NavItem): item is NavCollapsible {
    return 'items' in item && Array.isArray(item.items) && item.items.length > 0
  }
</script>

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
            <a
              href={item.url}
              onclick={(e: MouseEvent) => {
                e.preventDefault()
                handleNavigation(item.url, () => {
                  sidebar.setOpenMobile(false)
                })
              }}
              class="flex items-center gap-2 w-full"
            >
              {#if item.icon}
                {@const IconComponent = item.icon}
                <IconComponent class="h-4 w-4" />
              {/if}
              <span>{itemTranslatedTitle}</span>
              {#if item.badge}
                <Badge
                  variant="secondary"
                  class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
                >
                  {item.badge}
                </Badge>
              {/if}
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      {:else if isNavCollapsible(item)}
        {#if sidebar.state === 'collapsed'}
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
                  <Badge
                    variant="secondary"
                    class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    {item.badge}
                  </Badge>
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
                  <a
                    href={subItem.url}
                    onclick={(e: MouseEvent) => {
                      e.preventDefault()
                      handleNavigation(subItem.url, () => {
                        sidebar.setOpenMobile(false)
                      })
                    }}
                    class="flex items-center gap-2 w-full"
                  >
                    {#if subItem.icon}
                      {@const SubIconComponent = subItem.icon}
                      <SubIconComponent class="h-4 w-4" />
                    {/if}
                    <span>{subTranslatedTitle}</span>
                    {#if subItem.badge}
                      <Badge
                        variant="secondary"
                        class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        {subItem.badge}
                      </Badge>
                    {/if}
                  </a>
                </DropdownMenuItem>
              {/each}
            </DropdownMenuContent>
          </DropdownMenu>
        {:else}
          <!-- SidebarMenuCollapsible -->
          {@const itemTranslatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title}
          <Collapsible
            open={checkIsActive(currentUrl, item, true)}
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
                    <Badge
                      variant="secondary"
                      class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      {item.badge}
                    </Badge>
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
                        <a
                          href={subItem.url}
                          onclick={(e: MouseEvent) => {
                            e.preventDefault()
                            handleNavigation(subItem.url, () => {
                              sidebar.setOpenMobile(false)
                            })
                          }}
                          class="flex items-center gap-2 w-full"
                        >
                          {#if subItem.icon}
                            {@const SubIconComponent = subItem.icon}
                            <SubIconComponent class="h-4 w-4" />
                          {/if}
                          <span>{subTranslatedTitle}</span>
                          {#if subItem.badge}
                            <Badge
                              variant="secondary"
                              class="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
                            >
                              {subItem.badge}
                            </Badge>
                          {/if}
                        </a>
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
