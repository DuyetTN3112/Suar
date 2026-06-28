<script lang="ts">
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'

  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import ReviewRelatedTaskCommentsPanel from '../../components/review_related_task_comments_panel.svelte'

  interface Evidence {
    id: string
    evidenceType: string
    url: string
    title: string | null
    description: string | null
  }

  interface Props {
    taskId: string | null
    disputeStatus: string
    evidences: Evidence[]
    showEvidenceForm: boolean
    evidenceType: string
    evidenceUrl: string
    evidenceTitle: string
    evidenceDesc: string
    uploadingEvidence: boolean
    onAddEvidence: () => void
  }

  let {
    taskId,
    disputeStatus,
    evidences,
    showEvidenceForm = $bindable(),
    evidenceType = $bindable(),
    evidenceUrl = $bindable(),
    evidenceTitle = $bindable(),
    evidenceDesc = $bindable(),
    uploadingEvidence,
    onAddEvidence,
  }: Props = $props()
  const { t } = useTranslation()

  function handleSubmit(e: Event) {
    e.preventDefault()
    onAddEvidence()
  }
  const perPage = 10
  let currentPage = $state(1)
  const pagination = $derived(buildOffsetPagination({
    page: currentPage,
    perPage,
    total: evidences.length,
  }))
  const paginatedEvidences = $derived(paginateOffsetItems(evidences, pagination))
</script>

<Card>
  <div class="px-5 py-4 border-b border-border flex items-center justify-between">
    <CardTitle>{t('task.reviews.evidence_tab.title', {}, 'Evidence')}</CardTitle>
    {#if disputeStatus !== 'resolved' && disputeStatus !== 'rejected'}
      <Button size="sm" variant="outline" onclick={() => { showEvidenceForm = !showEvidenceForm }}>
        {showEvidenceForm ? t('task.reviews.evidence_tab.close', {}, 'Close') : t('task.reviews.evidence_tab.add', {}, 'Add')}
      </Button>
    {/if}
  </div>
  <CardContent class="space-y-4 pt-4">
    <ReviewRelatedTaskCommentsPanel
      {taskId}
      mode="all"
      title={t('task.reviews.evidence_tab.package_comments_title', {}, 'Task comments in package')}
      description=""
    />

    {#if showEvidenceForm}
      <form onsubmit={handleSubmit} class="space-y-3 border border-border bg-card p-3 text-sm font-sans">
        <div class="space-y-1">
          <Label for="ev-title">{t('task.reviews.evidence_tab.evidence_title', {}, 'Evidence title')} <span class="text-destructive">*</span></Label>
          <Input id="ev-title" type="text" bind:value={evidenceTitle} placeholder={t('task.reviews.evidence_tab.title_placeholder', {}, 'Example: Merged pull request')} required />
        </div>
        <div class="space-y-1">
          <Label for="ev-type">{t('task.reviews.evidence_tab.type', {}, 'Type')}</Label>
          <select id="ev-type" bind:value={evidenceType} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="pull_request">Pull Request Link</option>
            <option value="demo">Demo Web/App Link</option>
            <option value="document">{t('task.reviews.evidence_tab.document', {}, 'Supporting document')}</option>
            <option value="screenshot">{t('task.reviews.evidence_tab.screenshot', {}, 'Screenshot')}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label for="ev-url">{t('task.reviews.evidence_tab.evidence_url', {}, 'Evidence URL')} <span class="text-destructive">*</span></Label>
          <Input id="ev-url" type="text" bind:value={evidenceUrl} placeholder="https://github.com/.../pull/..." required />
        </div>
        <div class="space-y-1">
          <Label for="ev-desc">{t('task.reviews.evidence_tab.description', {}, 'Short description')}</Label>
          <Textarea id="ev-desc" bind:value={evidenceDesc} placeholder={t('task.reviews.evidence_tab.description_placeholder', {}, 'Short description...')} rows={2} />
        </div>
        <Button type="submit" size="sm" class="w-full" disabled={uploadingEvidence || !evidenceUrl.trim() || !evidenceTitle.trim()}>
          {uploadingEvidence ? t('task.reviews.evidence_tab.uploading', {}, 'Uploading...') : t('task.reviews.evidence_tab.submit', {}, 'Add evidence')}
        </Button>
      </form>
    {/if}

    {#if evidences.length === 0}
      <p class="text-sm text-muted-foreground">{t('task.reviews.evidence_tab.empty', {}, 'No evidence yet.')}</p>
    {:else}
      <div class="space-y-2 font-sans">
        {#each paginatedEvidences as ev (ev.id)}
          <div class="rounded-lg border border-border bg-card p-3 text-xs">
            <p class="font-bold text-foreground">{ev.title ?? ev.evidenceType}</p>
            {#if ev.description}
              <p class="mt-1 text-muted-foreground">{ev.description}</p>
            {/if}
            <a href={ev.url} target="_blank" rel="noreferrer" class="mt-2 inline-block text-foreground hover:underline font-mono">
              {t('task.reviews.evidence_tab.open', {}, 'Open evidence')}
            </a>
          </div>
        {/each}
      </div>
      <UnifiedOffsetPagination
        {pagination}
        onPageChange={(page: number) => {
          currentPage = page
        }}
      />
    {/if}
  </CardContent>
</Card>
