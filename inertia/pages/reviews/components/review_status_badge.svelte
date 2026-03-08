<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import type { ReviewSessionStatus } from '../types.svelte'
  import { REVIEW_STATUS_CONFIG } from '../types.svelte'

  interface Props {
    status: ReviewSessionStatus
    class?: string
  }

  const { status, class: className = '' }: Props = $props()

  const config = $derived(REVIEW_STATUS_CONFIG[status])
</script>

<Badge variant={config.variant} class={className}>
  {config.labelVi}
</Badge>
