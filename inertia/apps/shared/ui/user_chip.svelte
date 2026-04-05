<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type UserChipSize = 'sm' | 'md' | 'lg'

  type Props = HTMLAttributes<HTMLDivElement> & {
    name?: string | null
    email?: string | null
    avatarUrl?: string | null
    subtitle?: string | null
    size?: UserChipSize
    class?: string
  }

  const {
    name = null,
    email = null,
    avatarUrl = null,
    subtitle = null,
    size = 'md',
    class: className,
    ...restProps
  }: Props = $props()

  const avatarSizeClass: Record<UserChipSize, string> = {
    sm: 'size-7 text-[0.62rem]',
    md: 'size-9 text-xs',
    lg: 'size-11 text-sm',
  }

  const labelSizeClass: Record<UserChipSize, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const displayName = $derived(name?.trim() || email?.trim() || 'Unknown user')
  const supportingText = $derived(subtitle?.trim() || (name?.trim() ? email?.trim() : null))
  const initials = $derived(
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
</script>

<div
  data-testid="user-chip"
  class={cn('inline-flex min-w-0 items-center gap-3 rounded-full border border-border bg-card px-2 py-1 text-card-foreground shadow-sm', className)}
  {...restProps}
>
  <div
    class={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-black tracking-[0.08em] text-muted-foreground',
      avatarSizeClass[size]
    )}
    aria-hidden="true"
  >
    {#if avatarUrl}
      <img src={avatarUrl} alt="" class="h-full w-full object-cover" />
    {:else}
      {initials}
    {/if}
  </div>

  <div class="min-w-0 pr-2">
    <p class={cn('truncate font-bold leading-5 text-foreground', labelSizeClass[size])}>{displayName}</p>
    {#if supportingText}
      <p class="truncate text-xs leading-4 text-muted-foreground">{supportingText}</p>
    {/if}
  </div>
</div>
