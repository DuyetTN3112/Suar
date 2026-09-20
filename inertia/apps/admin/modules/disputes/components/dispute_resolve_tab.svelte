<script lang="ts">
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Label from '@/apps/admin/shared/ui/label.svelte'
  import Textarea from '@/apps/admin/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import { Bot, CheckCircle2, ChevronDown, CircleDot } from 'lucide-svelte'

  import { diagnoseAiFailure } from '../ai_failure_diagnostics.js'
  import {
    auditContextLabel,
    capabilityProposalStatusLabel,
    complexityStatusLabel,
    debatePreview,
    debateStage,
    decisionLabel,
    difficultyLabel,
    parseStructuredVerdict,
    profileAssessmentStatusLabel,
    traceBlocks,
    type AssessedDifficulty,
    type DebateTraceEntry,
    type DisputeResolveTabProps,
  } from '../lib/dispute_resolve_helpers.js'

  let {
    dispute,
    aiEvaluations,
    resolving,
    finalDecision = $bindable(),
    finalRationale = $bindable(),
    onAcceptAi,
    approvingProfileProposal = false,
    onApproveProfileProposal = () => {},
    onResolve,
  }: DisputeResolveTabProps = $props()

  const { t } = useTranslation()
  let customDecisionOpen = $state(false)
  const latestAiEvaluation = $derived(
    aiEvaluations.find((evaluation) => evaluation.status === 'completed') ?? null
  )
  const latestFailedAiEvaluation = $derived(
    aiEvaluations.find((evaluation) => evaluation.status === 'failed') ?? null
  )
  const debateTrace = $derived(
    (latestAiEvaluation?.response_payload?.debate_trace ?? []).filter(
      (entry: DebateTraceEntry) => entry.type !== 'trace_initialized' && entry.visibility !== 'internal'
    ) as DebateTraceEntry[]
  )
  const debateRoles = $derived(
    debateTrace.reduce<Array<{ id: string; actor: string; label: string }>>((roles, entry, index) => {
      const stage = debateStage(entry)
      const id = entry.roleId ?? entry.fromRole ?? `${stage.label}-${index}`
      return roles.some((role) => role.id === id)
        ? roles
        : [...roles, { id, actor: stage.actor, label: stage.label }]
    }, [])
  )
  const debateRoundCount = $derived(Math.max(0, ...debateTrace.map((entry, index) => entry.round ?? index + 1)))
  const decisionTrace = $derived(debateTrace.find((entry) => entry.type === 'decision') ?? null)
  // New Clawagent callbacks persist the canonical verdict object directly.
  // Older evaluations only expose it as JSON in the decision trace.
  const structuredVerdict = $derived(
    parseStructuredVerdict(latestAiEvaluation?.response_payload?.verdict ?? decisionTrace?.evidence)
  )
  const hasDecisionBasis = $derived(
    Boolean(
      structuredVerdict?.rationale &&
        structuredVerdict.evidenceSummary &&
        structuredVerdict.actionItems.length > 0
    )
  )
  const canAcceptAi = $derived(Boolean(latestAiEvaluation?.recommendation) && hasDecisionBasis)
  const canResolve = $derived(finalRationale.trim().length > 0)
  const isClosed = $derived(['resolved', 'rejected', 'cancelled'].includes(dispute.status))
  const canApproveProfileProposal = $derived(['resolved', 'done'].includes(dispute.status))
  const approvedProposalIndexes = $derived(
    new Set(
      (latestAiEvaluation?.profile_approvals ?? latestAiEvaluation?.profileApprovals ?? [])
        .map((approval) =>
          'proposal_index' in approval ? approval.proposal_index : approval.proposalIndex
        )
        .filter((index): index is number => Number.isSafeInteger(index) && index >= 0)
    )
  )
</script>

<section class="overflow-hidden rounded-2xl border border-border bg-card" data-demo-section="admin-dispute-ai-conclusion">
  <CardHeader class="border-b border-border">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="max-w-2xl">
        <p class="text-sm font-semibold text-muted-foreground">Đề xuất của AI</p>
        <CardTitle class="mt-1 text-xl">Kết luận và căn cứ để quản trị viên xem xét</CardTitle>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          Đây là hồ sơ tư vấn, không tự động thay thế quyết định của quản trị viên. Hãy đối chiếu với tab Chứng cứ trước khi ban hành quyết định.
        </p>
      </div>
      {#if latestAiEvaluation}
        <Badge variant="secondary" class="font-mono text-[10px]">{latestAiEvaluation.status}</Badge>
      {/if}
    </div>
  </CardHeader>

  <CardContent class="space-y-6 pt-5">
    {#if latestAiEvaluation && structuredVerdict}
      <section class="border-b border-border pb-5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-foreground">Đề xuất</span>
          <Badge variant="outline" class="font-mono text-[10px]">
            {decisionLabel(structuredVerdict.recommendation ?? latestAiEvaluation.recommendation, t)}
          </Badge>
          {#if latestAiEvaluation.confidence_score !== null && latestAiEvaluation.confidence_score !== undefined}
            <span class="text-xs text-muted-foreground">AI tự đánh giá độ tin cậy {Math.round(Number(latestAiEvaluation.confidence_score) * 100)}%</span>
          {/if}
        </div>
        <p class="mt-3 max-w-4xl whitespace-pre-wrap text-base leading-7 text-foreground">
          {structuredVerdict.verdict ?? latestAiEvaluation.summary}
        </p>
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="space-y-3">
          <h3 class="font-semibold text-foreground">Lập luận của AI</h3>
          <p class="whitespace-pre-wrap text-sm leading-6 text-foreground">{structuredVerdict.rationale}</p>
        </section>
        <section class="space-y-3 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 class="font-semibold text-foreground">Chứng cứ đã chi phối kết luận</h3>
          <p class="whitespace-pre-wrap text-sm leading-6 text-foreground">{structuredVerdict.evidenceSummary}</p>
          {#if structuredVerdict.scoreOrReviewDelta}
            <div class="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
              <span class="font-semibold">Đề xuất áp dụng:</span> {structuredVerdict.scoreOrReviewDelta}
            </div>
          {/if}
        </section>
      </div>

      <div class="grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
        <section>
          <h3 class="font-semibold text-foreground">Việc cần thực hiện nếu admin đồng ý</h3>
          <ol class="mt-3 space-y-2 text-sm leading-6 text-foreground">
            {#each structuredVerdict.actionItems as item, index}
              <li class="flex gap-3"><span class="font-mono text-muted-foreground">{index + 1}.</span><span>{item}</span></li>
            {/each}
          </ol>
        </section>
        <section class="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 class="font-semibold text-foreground">Đánh giá độ khó thực tế</h3>
          {#if structuredVerdict.complexityAssessment}
            {@const assessment = structuredVerdict.complexityAssessment}
            <div class="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-foreground">{difficultyLabel(assessment.assessedDifficulty)}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{complexityStatusLabel(assessment.status)}</p>
                </div>
                {#if assessment.declaredDifficulty}
                  <span class="text-xs text-muted-foreground">Nhãn ban đầu: {difficultyLabel(assessment.declaredDifficulty as AssessedDifficulty)}</span>
                {/if}
              </div>
              {#if assessment.basis.length > 0}
                <ul class="mt-3 space-y-1.5 text-sm leading-6 text-foreground">
                  {#each assessment.basis as item}<li class="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>{/each}
                </ul>
              {/if}
              {#if assessment.profileEffect}<p class="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">{assessment.profileEffect}</p>{/if}
              {#if assessment.adminActionRequired}<p class="mt-2 text-xs font-medium text-muted-foreground">Chỉ áp dụng sau khi quản trị viên phê duyệt; Suar sẽ tính lại hồ sơ theo công thức chuẩn.</p>{/if}
            </div>
          {:else}
            <p class="mt-3 text-sm leading-6 text-muted-foreground">Kết quả AI cũ chưa có đánh giá độ khó thực tế. Hãy chạy lại AI để nhận phân tích theo hồ sơ Suar.</p>
          {/if}
        </section>
      </div>

      <section class="border-t border-border pt-5" aria-label="Đề xuất năng lực và công việc của AI">
        <div class="max-w-3xl">
          <h3 class="font-semibold text-foreground">Đề xuất công việc và năng lực cho hồ sơ</h3>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            AI chỉ đề xuất dựa trên căn cứ. AI không được tự ghi hồ sơ, tự đổi mức năng lực hay tự công khai công việc.
          </p>
        </div>
        {#if structuredVerdict.profileAssessment}
          {@const assessment = structuredVerdict.profileAssessment}
          <div class="mt-3 rounded-lg border border-border bg-muted/20 p-4">
            <p class="text-sm font-semibold text-foreground">{profileAssessmentStatusLabel(assessment.status)}</p>
            {#if assessment.workClaim}
              <article class="mt-3 rounded-md border border-border bg-background p-3">
                <p class="font-medium text-foreground">{assessment.workClaim.statement}</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {assessment.workClaim.action} · {assessment.workClaim.object}
                  {#if assessment.workClaim.ownershipLevel} · {assessment.workClaim.ownershipLevel}{/if}
                </p>
                <p class="mt-2 text-sm leading-6 text-foreground">{assessment.workClaim.contextSummary}</p>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{assessment.workClaim.outcomeSummary}</p>
              </article>
            {/if}
            {#if assessment.capabilityProposals.length > 0}
              <ul class="mt-3 space-y-2">
                {#each assessment.capabilityProposals as proposal, proposalIndex}
                  <li class="rounded-md border border-border bg-background p-3">
                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                      <p class="font-medium text-foreground">{proposal.capabilityName}</p>
                      <span class="text-xs text-muted-foreground">{capabilityProposalStatusLabel(proposal.status)}</span>
                    </div>
                    <dl class="mt-2 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        <dt class="inline font-medium text-foreground">Điều kiện nhận Task:</dt>
                        <dd class="inline"> {proposal.declaredMinimumLevel ?? proposal.declaredTargetLevel ?? 'chưa có'}</dd>
                      </div>
                      <div>
                        <dt class="inline font-medium text-foreground">Độ khó thực tế của phần việc:</dt>
                        <dd class="inline"> {proposal.proposedTaskDifficultyLevel ?? 'AI chưa đủ căn cứ để xếp mức'}</dd>
                      </div>
                      <div>
                        <dt class="inline font-medium text-foreground">Năng lực người làm thể hiện:</dt>
                        <dd class="inline"> {proposal.proposedObservedLevel ?? 'chưa xếp mức'}</dd>
                      </div>
                    </dl>
                    <p class="mt-2 text-sm leading-6 text-foreground">{proposal.rationale}</p>
                    {#if proposal.evidenceRefs.length > 0}
                      <p class="mt-2 text-xs leading-5 text-muted-foreground">Dẫn chiếu: {proposal.evidenceRefs.join(' · ')}</p>
                    {/if}
                    {#if proposal.taskDifficultyRationale}
                      <p class="mt-2 border-t border-border pt-2 text-sm leading-6 text-foreground">
                        <span class="font-medium">Lý do xếp độ khó:</span> {proposal.taskDifficultyRationale}
                      </p>
                    {/if}
                    {#if proposal.taskDifficultyEvidenceRefs.length > 0}
                      <p class="mt-1 text-xs leading-5 text-muted-foreground">Căn cứ độ khó: {proposal.taskDifficultyEvidenceRefs.join(' · ')}</p>
                    {/if}
                    <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      {#if approvedProposalIndexes.has(proposalIndex)}
                        <Badge variant="secondary">Đã được quản trị viên phê duyệt</Badge>
                      {:else if canApproveProfileProposal && latestAiEvaluation}
                        <Button
                          size="sm"
                          onclick={() => onApproveProfileProposal(latestAiEvaluation.id, proposalIndex)}
                          disabled={approvingProfileProposal}
                        >
                          {approvingProfileProposal ? 'Đang lưu phê duyệt…' : 'Phê duyệt đề xuất này'}
                        </Button>
                        <span class="text-xs text-muted-foreground">Sau khi workflow review ở trạng thái Hoàn tất, dữ liệu này mới được dùng cho hồ sơ.</span>
                      {:else}
                        <span class="text-xs text-muted-foreground">Hãy chốt tranh chấp trước, rồi mới phê duyệt riêng đề xuất năng lực.</span>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if assessment.blockers.length > 0}
              <p class="mt-3 text-sm leading-6 text-muted-foreground">Điều kiện còn thiếu: {assessment.blockers.join(' · ')}</p>
            {/if}
            <p class="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">{assessment.profileEffect}</p>
          </div>
        {:else}
          <p class="mt-3 text-sm leading-6 text-muted-foreground">
            Kết quả AI này chưa có đề xuất hồ sơ theo cấu trúc mới; không được dùng nó để suy diễn năng lực hoặc cập nhật hồ sơ.
          </p>
        {/if}
      </section>

      <section class="border-t border-border pt-5">
        <h3 class="font-semibold text-foreground">Điểm chưa đủ để kết luận</h3>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {structuredVerdict.unknowns ?? 'AI không nêu điểm thiếu. Quản trị viên vẫn phải tự kiểm tra tab Chứng cứ.'}
        </p>
      </section>

      <details class="group border-t border-border pt-5" open>
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-1 py-2 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"><Bot size={18} aria-hidden="true" /></span>
            <div>
              <p class="font-semibold text-foreground">Phiên tranh luận của hội đồng AI</p>
              <p class="mt-0.5 text-sm text-muted-foreground">{debateRoles.length} vai trò AI, {debateRoundCount} vòng trao đổi, {debateTrace.length} bản ghi đã nhận.</p>
            </div>
          </div>
          <ChevronDown size={18} class="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>

        <div class="mt-4 border-t border-border pt-5">
          <p class="max-w-3xl text-sm leading-6 text-muted-foreground">Theo dõi thứ tự phát biểu, vai trò và vòng trao đổi dưới đây. Đây là bản ghi giải thích sau khi AI phản hồi; quyết định vẫn thuộc về quản trị viên.</p>

          <section class="mt-4 rounded-xl border border-border bg-muted/20 p-4" aria-label="Thành phần phiên tranh luận AI">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 class="text-sm font-semibold text-foreground">Thành phần phiên</h4>
                <p class="mt-0.5 text-xs text-muted-foreground">Mỗi vai trò chỉ xử lý một góc nhìn; AI điều phối tổng hợp ở bước cuối.</p>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={14} aria-hidden="true" /> Đã hoàn tất</span>
            </div>
            <ul class="mt-3 flex flex-wrap gap-2">
              {#each debateRoles as role}
                <li class="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                  <span class="font-medium">{role.actor}</span><span class="text-muted-foreground"> · {role.label}</span>
                </li>
              {/each}
            </ul>
          </section>

          <ol class="relative mt-5 space-y-0 before:absolute before:bottom-5 before:left-[18px] before:top-5 before:w-px before:bg-border">
            {#each debateTrace as entry, index}
              {@const stage = debateStage(entry)}
              <li class="relative grid grid-cols-[38px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                <span class="relative z-10 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"><stage.Icon size={16} aria-hidden="true" /></span>
                <article class="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-semibold text-foreground">{stage.actor}</p>
                      <p class="mt-0.5 text-sm text-muted-foreground">{stage.label} · {stage.description}</p>
                    </div>
                    <span class="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground"><CircleDot size={13} aria-hidden="true" /> Vòng {entry.round ?? index + 1}</span>
                  </div>
                  <p class="mt-3 text-sm leading-6 text-foreground">{debatePreview(entry)}</p>
                  {#if entry.audit}
                    <details class="mt-3 rounded-lg border border-border bg-background">
                      <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
                        Xem kiểm toán vai trò: role này đã làm gì?
                      </summary>
                      <div class="space-y-3 border-t border-border p-3 text-sm leading-6">
                        <div class="grid gap-3 sm:grid-cols-2">
                          <div><p class="text-xs font-medium text-muted-foreground">Role template</p><p class="mt-0.5 font-mono text-xs text-foreground">{entry.audit.template_role_id ?? entry.roleId ?? 'Không xác định'}</p></div>
                          <div><p class="text-xs font-medium text-muted-foreground">Lý do được chọn</p><p class="mt-0.5 text-foreground">{entry.audit.selection_reason ?? 'Vai trò hội đồng lõi.'}</p></div>
                        </div>
                        <div><p class="text-xs font-medium text-muted-foreground">Mandate</p><p class="mt-0.5 text-foreground">{entry.audit.mandate ?? 'Phân tích theo phạm vi role template.'}</p></div>
                        {#if (entry.audit.context_used ?? []).length > 0}
                          <div><p class="text-xs font-medium text-muted-foreground">Context đã kiểm tra</p><ul class="mt-1 flex flex-wrap gap-1.5">{#each entry.audit.context_used ?? [] as source}<li class="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">{auditContextLabel(source)}</li>{/each}</ul></div>
                        {/if}
                        {#if (entry.audit.checked_claims ?? []).length > 0}
                          <div><p class="text-xs font-medium text-muted-foreground">Các claim đã kiểm tra</p><ul class="mt-1 space-y-2">{#each entry.audit.checked_claims ?? [] as claim}<li class="rounded-md bg-muted/40 p-2"><p class="font-medium text-foreground">{claim.claim}</p><p class="mt-0.5 text-muted-foreground">{claim.assessment ?? 'Chưa có nhận định riêng.'}</p></li>{/each}</ul></div>
                        {/if}
                        <div><p class="text-xs font-medium text-muted-foreground">Đóng góp vào phiên</p><p class="mt-0.5 text-foreground">{entry.audit.contribution ?? entry.summary ?? 'Không có nội dung.'}</p></div>
                      </div>
                    </details>
                  {/if}
                  <details class="mt-3">
                    <summary class="cursor-pointer text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Xem lập luận và dữ kiện đã ghi nhận</summary>
                    <div class="mt-3 max-h-80 space-y-2 overflow-auto rounded-lg bg-background p-3 text-sm leading-6 text-foreground">
                      {#each traceBlocks(entry) as block}
                        {#if block.kind === 'heading'}
                          <p class="pt-2 font-semibold text-foreground first:pt-0">{block.text}</p>
                        {:else if block.kind === 'bullet'}
                          <p class="flex gap-2"><span aria-hidden="true">•</span><span>{block.text}</span></p>
                        {:else if block.kind === 'detail'}
                          <p><span class="font-medium text-foreground">{block.label ?? 'Thông tin'}:</span> {block.text}</p>
                        {:else}
                          <p>{block.text}</p>
                        {/if}
                      {/each}
                    </div>
                  </details>
                </article>
              </li>
            {/each}
          </ol>
        </div>
      </details>
    {:else if latestFailedAiEvaluation}
      {@const failure = diagnoseAiFailure(latestFailedAiEvaluation.error_message)}
      <section class="rounded-xl border border-destructive/30 bg-destructive/5 p-4" aria-live="polite">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-foreground">AI không hoàn tất phân tích</h3>
            <p class="mt-1 text-sm leading-6 text-foreground">{failure.label}</p>
          </div>
          <Badge variant="destructive" class="font-mono text-[10px]">failed</Badge>
        </div>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">{failure.explanation}</p>
        <p class="mt-2 text-sm leading-6 text-muted-foreground"><span class="font-semibold text-foreground">Xử lý:</span> {failure.action}</p>
        {#if latestFailedAiEvaluation.error_message}
          <details class="mt-3 rounded-lg border border-border bg-background">
            <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">Xem lỗi kỹ thuật đầy đủ</summary>
            <pre class="max-h-56 overflow-auto whitespace-pre-wrap break-words border-t border-border p-3 font-mono text-xs leading-5 text-foreground">{latestFailedAiEvaluation.error_message}</pre>
          </details>
        {/if}
        <p class="mt-3 text-xs text-muted-foreground">Evaluation ID: <code>{latestFailedAiEvaluation.id}</code></p>
      </section>
    {:else if latestAiEvaluation}
      <div class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        AI đã trả về kết quả nhưng thiếu hồ sơ kết luận có cấu trúc (lập luận, chứng cứ, điểm chưa đủ và hành động). Không thể dùng kết quả này làm căn cứ phê duyệt.
      </div>
    {:else}
      <div class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        AI chưa hoàn tất phân tích. Khi callback hoàn tất, hồ sơ kết luận sẽ xuất hiện tại đây.
      </div>
    {/if}

    {#if !isClosed}
      <section class="space-y-4 border-t border-border pt-5">
        <div>
          <h3 class="font-semibold text-foreground">Quyết định của quản trị viên hệ thống</h3>
          <p class="mt-1 text-sm text-muted-foreground">Quyết định cuối cùng phải nêu rõ căn cứ; AI chỉ là nguồn tư vấn.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Button onclick={onAcceptAi} disabled={resolving || !canAcceptAi}>
            {resolving ? 'Đang lưu quyết định…' : 'Dùng kết luận AI để chốt tranh chấp'}
          </Button>
          <Button variant="outline" onclick={() => { customDecisionOpen = !customDecisionOpen }} disabled={resolving}>
            {customDecisionOpen ? 'Ẩn quyết định khác' : 'Ra quyết định khác'}
          </Button>
        </div>
        {#if !canAcceptAi}
          <p class="text-sm text-muted-foreground">Chưa thể dùng kết luận AI: hồ sơ phải có lập luận, căn cứ chứng cứ và hành động đề xuất.</p>
        {/if}

        {#if customDecisionOpen}
          <div class="space-y-4 border-t border-border pt-5">
            <div class="space-y-2">
              <Label for="decision">Quyết định cuối cùng</Label>
              <select id="decision" bind:value={finalDecision} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="dismiss_dispute">Bác bỏ tranh chấp</option>
                <option value="uphold_review">Giữ nguyên đánh giá</option>
                <option value="partially_accept">Chấp nhận một phần</option>
                <option value="adjust_score">Điều chỉnh điểm trực tiếp</option>
                <option value="request_re_review">Yêu cầu đánh giá lại</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="rationale">Căn cứ quyết định <span class="text-destructive">*</span></Label>
              <Textarea id="rationale" bind:value={finalRationale} placeholder="Nêu chứng cứ và lý do cho quyết định khác với đề xuất AI…" rows={4} />
            </div>
            <div class="flex justify-end"><Button variant="destructive" onclick={onResolve} disabled={resolving || !canResolve}>{resolving ? 'Đang lưu quyết định…' : 'Ban hành quyết định'}</Button></div>
          </div>
        {/if}
      </section>
    {:else if dispute.final_decision}
      <div class="rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p class="font-semibold text-foreground">Quyết định cuối cùng: {dispute.final_decision}</p>
        {#if dispute.final_rationale}<p class="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">{dispute.final_rationale}</p>{/if}
      </div>
    {/if}
  </CardContent>
</section>
