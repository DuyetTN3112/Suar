<script lang="ts">
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { ReviewSessionStatus } from '../types.svelte'
  import { REVIEW_STATUS_CONFIG } from '../types.svelte'

  interface Props {
    status: ReviewSessionStatus
    class?: string
  }

  const { status, class: className = '' }: Props = $props()
  const { t } = useTranslation()

  const config = $derived(REVIEW_STATUS_CONFIG[status])
</script>

<Badge variant={config.variant} class={className}>
  {t(`task.reviews.status.${status}`, {}, config.label)}
</Badge>
