<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import { Menu } from 'lucide-svelte'
  import { cn } from '$lib/utils-svelte'
  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'

  interface TopNavLink {
    title: string
    href: string
    isActive: boolean
    disabled?: boolean
  }

  interface TopNavProps {
    class?: string
    links: TopNavLink[]
  }

  const { class: className, links }: TopNavProps = $props()

  // Optimize navigation to maintain SPA behavior
  function handleNavigation(url: string, e: MouseEvent) {
    e.preventDefault()

    router.visit(url, {
      preserveScroll: true,
      preserveState: true,
    })
  }
</script>

<div class="md:hidden">
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button size="icon" variant="outline">
        <Menu />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="bottom" align="start">
      {#each links as link}
        <DropdownMenuItem>
          <Link
            href={link.href}
            class={!link.isActive ? 'text-muted-foreground' : ''}
            onclick={(e: MouseEvent) => {
              if (!link.disabled) {
                handleNavigation(link.href, e)
              }
            }}
          >
            {link.title}
          </Link>
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
</div>

<nav
  class={cn(
    'hidden items-center space-x-4 md:flex lg:space-x-6',
    className
  )}
>
  {#each links as link}
    <Link
      href={link.href}
      class="hover:text-primary text-sm font-medium transition-colors {link.isActive ? '' : 'text-muted-foreground'}"
      onclick={(e: MouseEvent) => {
        if (!link.disabled) {
          handleNavigation(link.href, e)
        }
      }}
    >
      {link.title}
    </Link>
  {/each}
</nav>
