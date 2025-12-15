<script lang="ts">
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'

  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    showResponseForm: boolean
    orgPosition: 'agree' | 'disagree'
    orgSummary: string
    submittingResponse: boolean
    onSubmitResponse: () => void
  }

  let {
    showResponseForm = $bindable(),
    orgPosition = $bindable(),
    orgSummary = $bindable(),
    submittingResponse,
    onSubmitResponse,
  }: Props = $props()
  const { t } = useTranslation()

  function handleSubmit(e: Event) {
    e.preventDefault()
    onSubmitResponse()
  }
</script>

<Card class="rounded-[28px] border-primary/30 bg-card">
  <div class="flex items-center justify-between border-b border-border px-5 py-4">
    <div>
      <CardTitle class="text-xl font-black tracking-tight">{t('task.disputes.detail.response_tab.title', {}, 'Organization response')}</CardTitle>
      <p class="mt-1 text-xs text-muted-foreground">
        {t('task.disputes.detail.response_tab.subtitle', {}, 'Organization representative gives an official response before the admin makes a final decision.')}
      </p>
    </div>
    <Button size="sm" onclick={() => { showResponseForm = !showResponseForm }}>
      {showResponseForm ? t('task.disputes.detail.response_tab.close', {}, 'Close') : t('task.disputes.detail.response_tab.open', {}, 'Open')}
    </Button>
  </div>
  <CardContent class="space-y-4 pt-4">
    {#if showResponseForm}
      <form onsubmit={handleSubmit} class="space-y-4 text-sm font-sans">
        <div class="rounded-2xl border border-border bg-background/80 p-4">
          <Label>{t('task.disputes.detail.response_tab.position_label', {}, 'Organization position')}</Label>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 font-sans">
            <label class={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${orgPosition === 'agree' ? 'border-border/70 bg-muted/40' : 'border-border bg-background'}`}>
              <input type="radio" name="org-position" value="agree" bind:group={orgPosition} />
              <div>
                <div class="font-medium text-foreground">{t('task.disputes.detail.response_tab.agree_title', {}, 'Agree to adjustment')}</div>
                <div class="mt-1 text-xs text-muted-foreground">{t('task.disputes.detail.response_tab.agree_description', {}, 'Accept that some score or assessment should change.')}</div>
              </div>
            </label>
            <label class={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${orgPosition === 'disagree' ? 'border-border/70 bg-muted/40' : 'border-border bg-background'}`}>
              <input type="radio" name="org-position" value="disagree" bind:group={orgPosition} />
              <div>
                <div class="font-medium text-foreground">{t('task.disputes.detail.response_tab.disagree_title', {}, 'Keep score unchanged')}</div>
                <div class="mt-1 text-xs text-muted-foreground">{t('task.disputes.detail.response_tab.disagree_description', {}, 'Defend the current review outcome with rationale and evidence.')}</div>
              </div>
            </label>
          </div>
        </div>

        <div class="space-y-2 rounded-2xl border border-border bg-background/80 p-4 font-sans">
          <Label for="org-summary">{t('task.disputes.detail.response_tab.summary_label', {}, 'Response statement')} <span class="text-destructive">*</span></Label>
          <p class="text-xs text-muted-foreground">
            {t('task.disputes.detail.response_tab.summary_help', {}, 'State the timeline, review basis, agreed or disputed points, and evidence reviewers should check.')}
          </p>
          <Textarea
            id="org-summary"
            bind:value={orgSummary}
            placeholder={t('task.disputes.detail.response_tab.summary_placeholder', {}, 'Enter response...')}
            rows={6}
            required
          />
        </div>

        <Button type="submit" class="w-full" disabled={submittingResponse || !orgSummary.trim()}>
          {submittingResponse ? t('task.disputes.detail.response_tab.submitting', {}, 'Sending...') : t('task.disputes.detail.response_tab.submit', {}, 'Send response')}
        </Button>
      </form>
    {:else}
      <div class="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground font-sans">
        {t('task.disputes.detail.response_tab.closed_hint', {}, 'Open this panel to send the official organization response.')}
      </div>
    {/if}
  </CardContent>
</Card>
