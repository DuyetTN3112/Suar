<script lang="ts">
  /**
   * TrustScoreBadge — displays the user's trust score as a visual indicator.
   */
  import { Shield } from 'lucide-svelte'

  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { TrustTierCode } from '../types.svelte'
  import { TRUST_TIER_CONFIG } from '../types.svelte'

  interface Props {
    trustScore?: number | null
    trustTierCode?: string | null
    credibilityScore?: number | null
    class?: string
  }

  const { trustScore, trustTierCode, credibilityScore, class: className = '' }: Props = $props()
  const { t } = useTranslation()

  const tier = $derived(
    trustTierCode ? TRUST_TIER_CONFIG[trustTierCode as TrustTierCode] : null
  )
  const tierLabel = $derived(
    trustTierCode
      ? t(`user.profile_badge.trust_tiers.${trustTierCode}`, {}, tier?.label ?? trustTierCode)
      : null
  )
</script>

<div class="flex items-center gap-3 {className}">
  <div class="flex items-center gap-1.5">
    <Shield class="h-4 w-4" style={tier ? `color: ${tier.colorHex}` : ''} />
    <div class="text-sm">
      {#if trustScore !== null && trustScore !== undefined}
        <span class="font-medium">{trustScore.toFixed(1)}</span>
        <span class="text-muted-foreground">{t('user.profile_badge.trust_score_suffix', {}, ' trust score')}</span>
      {:else}
        <span class="text-muted-foreground">{t('user.profile_badge.trust_score_empty', {}, 'No trust score yet')}</span>
      {/if}
    </div>
  </div>

  {#if tier}
    <span
      class="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border"
      style="border-color: {tier.colorHex}; color: {tier.colorHex}"
    >
      {tierLabel}
    </span>
  {/if}

  {#if credibilityScore !== null && credibilityScore !== undefined}
    <span class="text-xs text-muted-foreground">
      {t('user.profile_badge.credibility', { value: credibilityScore }, 'Credibility: :value%')}
    </span>
  {/if}
</div>
