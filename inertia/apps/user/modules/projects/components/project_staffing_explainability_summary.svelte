<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface MemberExplainability {
    reviewed_skills_count?: number
    imported_skills_count?: number
    under_dispute_skills_count?: number
  }

  interface Props {
    members: MemberExplainability[]
  }

  const { members }: Props = $props()
  const { t } = useTranslation()

  const reviewedMembersCount = $derived(
    members.filter((member) => (member.reviewed_skills_count ?? 0) > 0).length
  )
  const importedOnlyMembersCount = $derived(
    members.filter(
      (member) =>
        (member.imported_skills_count ?? 0) > 0 && (member.reviewed_skills_count ?? 0) === 0
    ).length
  )
  const underDisputeMembersCount = $derived(
    members.filter((member) => (member.under_dispute_skills_count ?? 0) > 0).length
  )
</script>

<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
  <span class="rounded-full bg-card/80 px-2.5 py-1">
    {t('project.staffing.reviewed_summary', { reviewed: reviewedMembersCount, total: members.length }, ':reviewed/:total reviewed')}
  </span>
  <span class="rounded-full bg-card/80 px-2.5 py-1">
    {t('project.staffing.imported_summary', { count: importedOnlyMembersCount }, ':count imported')}
  </span>
  <span class="rounded-full bg-card/80 px-2.5 py-1">
    {t('project.staffing.dispute_summary', { count: underDisputeMembersCount }, ':count disputed')}
  </span>
</div>
