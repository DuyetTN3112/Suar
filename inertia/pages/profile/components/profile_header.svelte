<script lang="ts">
  /**
   * ProfileHeader — user avatar, name, org, trust badge, and edit link.
   */
  import { Pencil, Building2, Mail } from 'lucide-svelte'

  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'

  import { navigateToProfileEdit } from '../profile_navigation'
  import type { SerializedUserProfile, TrustTierCode } from '../types.svelte'
  import { TRUST_TIER_CONFIG } from '../types.svelte'

  interface Props {
    user: SerializedUserProfile
    showEditButton?: boolean
    class?: string
  }

  const { user, showEditButton = false, class: className = '' }: Props = $props()

  const initialsSource = $derived(user.username || user.email || '?')
  const initials = $derived(
    initialsSource
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('')
  )

  const trustTier = $derived.by(() => {
    const code = user.trust_tier_code as TrustTierCode | null | undefined
    if (!code) return null
    return TRUST_TIER_CONFIG[code]
  })

  function goToEdit() {
    navigateToProfileEdit()
  }
</script>

<div class="flex items-start gap-4 {className}">
  <Avatar class="h-16 w-16">
    {#if user.avatar_url}
      <AvatarImage src={user.avatar_url} alt={user.username} />
    {/if}
    <AvatarFallback class="text-lg">{initials}</AvatarFallback>
  </Avatar>

  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2 flex-wrap">
      <h2 class="text-xl font-semibold truncate">{user.username}</h2>
      {#if trustTier}
        <Badge variant="outline" class="text-[10px]" style="border-color: {trustTier.colorHex}; color: {trustTier.colorHex}">
          {trustTier.labelVi}
        </Badge>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
      <div class="flex items-center gap-1">
        <Mail class="h-3.5 w-3.5" />
        <span>{user.email}</span>
      </div>
      {#if user.current_organization}
        <div class="flex items-center gap-1">
          <Building2 class="h-3.5 w-3.5" />
          <span>{user.current_organization.name}</span>
        </div>
      {/if}
    </div>

    {#if user.bio}
      <p class="text-sm text-muted-foreground mt-2 line-clamp-2">{user.bio}</p>
    {/if}
  </div>

  {#if showEditButton}
    <Button variant="outline" size="sm" onclick={goToEdit}>
      <Pencil class="h-3.5 w-3.5 mr-1.5" />
      Chỉnh sửa
    </Button>
  {/if}
</div>
