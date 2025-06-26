<script lang="ts">
  /**
   * ReviewerInfo — displays reviewer avatar + name + type badge.
   */
  import Badge from '@/components/ui/badge.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import type { SerializedUser, ReviewerType } from '../types.svelte'
  import { REVIEWER_TYPE_CONFIG } from '../types.svelte'

  interface Props {
    user: Pick<SerializedUser, 'id' | 'username' | 'email' | 'avatar_url'>
    reviewerType?: ReviewerType
    class?: string
  }

  const { user, reviewerType, class: className = '' }: Props = $props()
  const displayName = $derived(user.username || user.email)

  const initials = $derived(
    displayName
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('')
  )
</script>

<div class="flex items-center gap-2 {className}">
  <Avatar class="h-7 w-7">
    {#if user.avatar_url}
    <AvatarImage src={user.avatar_url} alt={displayName} />
    {/if}
    <AvatarFallback class="text-[10px]">{initials}</AvatarFallback>
  </Avatar>
  <div class="flex items-center gap-1.5">
    <span class="text-sm font-medium">{displayName}</span>
    {#if reviewerType}
      <Badge variant="outline" class="text-[10px]">
        {REVIEWER_TYPE_CONFIG[reviewerType].labelVi}
      </Badge>
    {/if}
  </div>
</div>
