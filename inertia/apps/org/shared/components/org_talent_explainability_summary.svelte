<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    totalMembers: number
    reviewedMembers: number
    importedOnlyMembers: number
    underDisputeMembers: number
  }

  const { totalMembers, reviewedMembers, importedOnlyMembers, underDisputeMembers }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
  <span class="rounded-full bg-muted/80 px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.reviewed_count', { reviewed: reviewedMembers, total: totalMembers }, ':reviewed/:total reviewed')}
  </span>
  <span class="rounded-full bg-muted/80 px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.imported_count', { count: importedOnlyMembers }, ':count imported')}
  </span>
  <span class="rounded-full bg-muted/80 px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.dispute_count', { count: underDisputeMembers }, ':count dispute')}
  </span>
</div>
