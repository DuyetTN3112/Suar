<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import ModeToggle from '@/components/ui/mode_toggle.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import SidebarTrigger from '@/components/ui/sidebar/sidebar_trigger.svelte'

  import { cn } from '$lib/utils-svelte'

  interface HeaderProps {
    class?: string
    fixed?: boolean
  }

  const { class: className, fixed = false }: HeaderProps = $props()

  let offset = $state(0)

  $effect(() => {
    const onScroll = () => {
      offset = document.body.scrollTop || document.documentElement.scrollTop
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => { document.removeEventListener('scroll', onScroll) }
  })
</script>

<header
  class={cn(
    'bg-background flex h-16 items-center gap-3 p-4 sm:gap-4',
    fixed && 'header-fixed peer/header fixed z-50 w-[inherit] rounded-md',
    offset > 10 && fixed ? 'shadow-sm' : 'shadow-none',
    className
  )}
>
  <SidebarTrigger class="scale-125 sm:scale-100" />
  <Separator orientation="vertical" class="h-6" />
  <div class="flex items-center gap-2 lg:gap-4">
    <Link href="/" class="flex items-center gap-2 lg:gap-3">
      <span class="flex h-6 w-6 rounded-md bg-primary text-primary-foreground items-center justify-center text-xs font-bold">S</span>
      <span class="text-lg font-semibold">Suar</span>
    </Link>
  </div>
  <div class="flex-1"></div>
  <div class="flex items-center gap-2">
    <ModeToggle />
  </div>
</header>
