<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface TalentExplainability {
    reviewed_skills_count?: number
    imported_skills_count?: number
    under_dispute_skills_count?: number
  }

  interface Props {
    talents: TalentExplainability[]
  }

  const { talents }: Props = $props()
  const { t } = useTranslation()

  const reviewedReadyCount = $derived(
    talents.filter((talent) => (talent.reviewed_skills_count ?? 0) > 0).length
  )
  const importedFirstCount = $derived(
    talents.filter(
      (talent) =>
        (talent.imported_skills_count ?? 0) > 0 && (talent.reviewed_skills_count ?? 0) === 0
    ).length
  )
  const underDisputeCount = $derived(
    talents.filter((talent) => (talent.under_dispute_skills_count ?? 0) > 0).length
  )
</script>

<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
  <span class="rounded-full bg-muted px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.reviewed_count', { reviewed: reviewedReadyCount, total: talents.length }, ':reviewed/:total reviewed')}
  </span>
  <span class="rounded-full bg-muted px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.imported_count', { count: importedFirstCount }, ':count imported')}
  </span>
  <span class="rounded-full bg-muted px-2.5 py-1 text-foreground">
    {t('organization.talent_explainability.dispute_count', { count: underDisputeCount }, ':count dispute')}
  </span>
</div>
