<script lang="ts">
  /* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  import { router, Link } from '@inertiajs/svelte'
  import axios from 'axios'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'

  interface Dispute {
    id: string
    review_session_id: string
    task_id: string
    task_title: string | null
    task_description: string | null
    organization_id: string | null
    project_id: string | null
    reviewee_id: string
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    created_at: string
    disputed_dimensions: Record<string, unknown>
    disputed_skill_reviews: Record<string, unknown>[]
    final_decision: string | null
    final_rationale: string | null
    review_session_status: string | null
  }

  interface Comment {
    id: string
    author_id: string
    body: string
    created_at: string
    author_context: string | null
    author_system_role: string | null
  }

  interface Evidence {
    id: string
    evidence_type: string
    url: string
    title: string | null
    description: string | null
    uploaded_by: string
    created_at: string
  }

  interface CaseFile {
    id: string
    case_version: number
    completeness_score: number
    missing_data: string[]
    created_at: string
  }

  interface AiEvaluation {
    id: string
    provider: string
    status: string
    recommendation: string | null
    confidence_score: number | null
    summary: string | null
    completed_at: string | null
  }

  interface TimelineEntry {
    id: string
    kind: 'audit' | 'comment' | 'evidence' | 'case_file' | 'ai_evaluation'
    action: string
    occurred_at: string
    actor_id: string | null
    actor_label: string | null
    summary: string
    metadata?: Record<string, unknown>
  }

  interface Props {
    dispute: Dispute
    comments: Comment[]
    evidences: Evidence[]
    case_files: CaseFile[]
    ai_evaluations: AiEvaluation[]
    timeline: TimelineEntry[]
  }

  const { dispute, comments, evidences, case_files, ai_evaluations, timeline }: Props = $props()

  // Actions states
  let commentBody = $state('')
  let postingComment = $state(false)

  let buildingCaseFile = $state(false)
  let startingAi = $state(false)

  // Resolve states
  let finalDecision = $state<'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'>('dismiss_dispute')
  let profileUpdateAction = $state<'recalculate_after_adjustment' | 'no_action'>('no_action')
  let reviewerCredibilityAction = $state<'mark_disputed_review' | 'no_action'>('no_action')
  let finalRationale = $state('')
  let resolving = $state(false)

  let errorMsg = $state('')
  let successMsg = $state('')

  async function postComment() {
    if (!commentBody.trim() || postingComment) return
    postingComment = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/reviews/disputes/${dispute.id}/comments`, {
        body: commentBody.trim(),
        visibility: 'all_parties',
      })
      commentBody = ''
      router.reload({ only: ['comments'] })
      successMsg = 'Đã gửi bình luận thành công.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi gửi bình luận.'
    } finally {
      postingComment = false
    }
  }

  async function buildCaseFile() {
    if (buildingCaseFile) return
    buildingCaseFile = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/case-files`)
      router.reload({ only: ['case_files'] })
      successMsg = 'Đã lập Case File snapshot thành công.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi lập Case File.'
    } finally {
      buildingCaseFile = false
    }
  }

  async function startAiEvaluation() {
    if (startingAi) return
    startingAi = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/ai-evaluations`, {
        provider: 'ai_council',
      })
      router.reload({ only: ['ai_evaluations'] })
      successMsg = 'Đã gửi yêu cầu đánh giá lên AI Council.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi gọi AI.'
    } finally {
      startingAi = false
    }
  }

  async function resolveDispute() {
    if (!finalRationale.trim() || resolving) return
    resolving = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/resolve`, {
        final_decision: finalDecision,
        final_rationale: finalRationale.trim(),
        profile_update_action: profileUpdateAction === 'no_action' ? undefined : profileUpdateAction,
        reviewer_credibility_action: reviewerCredibilityAction === 'no_action' ? undefined : reviewerCredibilityAction,
      })
      router.reload()
      successMsg = 'Đã giải quyết khiếu nại thành công.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi giải quyết khiếu nại.'
    } finally {
      resolving = false
    }
  }

  const roleMap: Record<string, string> = {
    system_admin: 'System Admin',
    reviewee: 'Reviewee',
    reviewer: 'Reviewer',
    org_owner: 'Org Owner',
    org_admin: 'Org Admin',
    project_manager: 'Project Manager',
  }
</script>

<svelte:head>
  <title>Admin - Chi tiết khiếu nại</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / Dispute Detail</p>
      <h1 class="text-4xl font-bold tracking-tight">Xử lý khiếu nại</h1>
      <p class="mt-2 text-sm text-muted-foreground">Hồ sơ chi tiết và các công cụ giúp admin quyết định kết quả tranh chấp.</p>
    </div>
    <Link href="/admin/disputes">
      <Button variant="outline">Quay lại danh sách</Button>
    </Link>
  </div>

  {#if successMsg}
    <div class="p-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-sm font-medium">
      {successMsg}
    </div>
  {/if}

  {#if errorMsg}
    <div class="p-3 bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium">
      {errorMsg}
    </div>
  {/if}

  <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
    <!-- Left Column: Context, Timeline & Comments -->
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Task & Review</CardTitle>
          <CardDescription>Bối cảnh của công việc bị tranh chấp điểm số</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div>
            <p class="text-muted-foreground font-semibold">Tên Task</p>
            <p class="font-medium text-base mt-1">{dispute.task_title ?? 'Task không rõ'}</p>
          </div>
          {#if dispute.task_description}
            <div>
              <p class="text-muted-foreground font-semibold">Mô tả công việc</p>
              <p class="mt-1 text-muted-foreground">{dispute.task_description}</p>
            </div>
          {/if}
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="text-muted-foreground font-semibold">Người khiếu nại (Reviewee)</p>
              <p class="font-medium">{dispute.reviewee_username ?? 'Không rõ'}</p>
              <p class="text-xs text-muted-foreground">{dispute.reviewee_email ?? ''}</p>
            </div>
            <div>
              <p class="text-muted-foreground font-semibold">Trạng thái review gốc</p>
              <Badge variant="outline">{dispute.review_session_status ?? 'N/A'}</Badge>
            </div>
          </div>
          <div>
            <p class="text-muted-foreground font-semibold">Lý do tranh chấp của user</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-white font-medium text-foreground">
              {dispute.dispute_reason}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline điều tra ({timeline.length})</CardTitle>
          <CardDescription>Dòng sự kiện hợp nhất từ audit log, hội thoại, minh chứng, case file và AI support.</CardDescription>
        </CardHeader>
        <CardContent>
          {#if timeline.length === 0}
            <p class="text-sm text-muted-foreground">Chưa có sự kiện điều tra nào.</p>
          {:else}
            <div class="space-y-3">
              {#each timeline as entry (entry.id)}
                <div class="border border-border rounded-lg p-3 bg-white text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <Badge variant="outline">{entry.kind}</Badge>
                      <span class="font-semibold text-foreground">{entry.action}</span>
                    </div>
                    <span class="text-xs text-muted-foreground">
                      {new Date(entry.occurred_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p class="mt-2 text-foreground">{entry.summary}</p>
                  <div class="mt-2 text-xs text-muted-foreground">
                    Actor:
                    {entry.actor_label ?? entry.actor_id ?? 'system'}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Comments Thread / Discussion -->
      <Card>
        <CardHeader>
          <CardTitle>Hội thoại trao đổi ({comments.length})</CardTitle>
          <CardDescription>Luồng bình luận trao đổi giữa các bên liên quan và admin</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          {#if comments.length === 0}
            <p class="text-sm text-muted-foreground text-center py-4">Chưa có hội thoại nào.</p>
          {:else}
            <div class="space-y-3">
              {#each comments as comment (comment.id)}
                <div class="border border-border rounded-lg p-3 bg-white text-sm">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-foreground">
                      User ID: {comment.author_id.substring(0, 8)}
                      {#if comment.author_context}
                        <Badge variant="outline" class="ml-1 text-[10px]">{roleMap[comment.author_context] ?? comment.author_context}</Badge>
                      {/if}
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p class="text-foreground mt-1 whitespace-pre-wrap">{comment.body}</p>
                </div>
              {/each}
            </div>
          {/if}

          {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
            <div class="space-y-2 mt-4 pt-4 border-t border-line">
              <Label for="admin-comment">Gửi phản hồi / Yêu cầu giải trình</Label>
              <Textarea
                id="admin-comment"
                bind:value={commentBody}
                placeholder="Nhập nội dung trao đổi hoặc ghi chú cho các bên..."
                rows={3}
              />
              <Button size="sm" onclick={postComment} disabled={postingComment || !commentBody.trim()}>
                {postingComment ? 'Đang gửi...' : 'Gửi bình luận'}
              </Button>
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Evidences List -->
      <Card>
        <CardHeader>
          <CardTitle>Minh chứng đính kèm ({evidences.length})</CardTitle>
          <CardDescription>Các bằng chứng/link Pull Request do các bên tải lên</CardDescription>
        </CardHeader>
        <CardContent>
          {#if evidences.length === 0}
            <p class="text-sm text-muted-foreground">Chưa có minh chứng nào được đính kèm.</p>
          {:else}
            <div class="grid gap-3 sm:grid-cols-2">
              {#each evidences as ev (ev.id)}
                <div class="border border-border rounded-lg p-3 bg-white text-sm">
                  <p class="font-semibold text-foreground">{ev.title ?? ev.evidence_type}</p>
                  {#if ev.description}
                    <p class="text-muted-foreground text-xs mt-1">{ev.description}</p>
                  {/if}
                  <a href={ev.url} target="_blank" rel="noreferrer" class="text-foreground text-xs mt-2 inline-block hover:underline">
                    Mở link minh chứng ↗
                  </a>
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Right Column: Case Files, AI evaluations & Resolution -->
    <div class="space-y-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Trạng thái giải quyết</CardTitle>
            <CardDescription>Cập nhật tiến trình khiếu nại</CardDescription>
          </div>
          <Badge variant={dispute.status === 'resolved' ? 'default' : 'secondary'}>
            {dispute.status.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div>
            <p class="text-muted-foreground font-semibold">Ngày tạo</p>
            <p class="font-medium">{new Date(dispute.created_at).toLocaleString('vi-VN')}</p>
          </div>
          {#if dispute.final_decision}
            <div>
              <p class="text-muted-foreground font-semibold">Quyết định cuối cùng</p>
              <Badge variant="default" class="mt-1">{dispute.final_decision}</Badge>
            </div>
            <div>
              <p class="text-muted-foreground font-semibold">Rationale</p>
              <p class="mt-1 text-muted-foreground">{dispute.final_rationale}</p>
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Case Files Box -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Immutable Case File ({case_files.length})</CardTitle>
            <CardDescription>Snapshot toàn bộ dữ liệu phục vụ audit và AI</CardDescription>
          </div>
          {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
            <Button size="sm" onclick={buildCaseFile} disabled={buildingCaseFile}>
              {buildingCaseFile ? 'Lập...' : 'Lập Snapshot'}
            </Button>
          {/if}
        </CardHeader>
        <CardContent>
          {#if case_files.length === 0}
            <p class="text-sm text-muted-foreground">Chưa có bản snapshot case file nào. Nhấn Lập Snapshot để tạo.</p>
          {:else}
            <div class="space-y-2">
              {#each case_files as cf (cf.id)}
                <div class="flex items-center justify-between p-2 border border-line bg-paper text-xs">
                  <div>
                    <span class="font-bold">v{cf.case_version}</span> - Độ hoàn thiện:
                    <span class="font-semibold {cf.completeness_score >= 80 ? 'text-emerald-600' : 'text-amber-600'}">
                      {cf.completeness_score}%
                    </span>
                  </div>
                  <span class="text-muted-foreground">{new Date(cf.created_at).toLocaleDateString()}</span>
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- AI Evaluation Box -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>AI Council Support ({ai_evaluations.length})</CardTitle>
            <CardDescription>Hỗ trợ tham mưu quyết định từ hội đồng AI</CardDescription>
          </div>
          {#if dispute.status !== 'resolved' && dispute.status !== 'rejected' && case_files.length > 0}
            <Button size="sm" onclick={startAiEvaluation} disabled={startingAi}>
              {startingAi ? 'Gửi...' : 'Gọi AI'}
            </Button>
          {/if}
        </CardHeader>
        <CardContent>
          {#if ai_evaluations.length === 0}
            <p class="text-sm text-muted-foreground">Chưa chạy đánh giá AI nào cho khiếu nại này.</p>
          {:else}
            <div class="space-y-3">
              {#each ai_evaluations as ai (ai.id)}
                <div class="border border-border rounded-lg p-3 bg-white text-xs">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold uppercase">{ai.provider}</span>
                    <Badge variant="outline">{ai.status}</Badge>
                  </div>
                  {#if ai.recommendation}
                    <div class="mt-2">
                      <span class="text-muted-foreground font-semibold">Khuyến nghị AI:</span>
                      <Badge variant="secondary" class="ml-1">{ai.recommendation}</Badge>
                    </div>
                  {/if}
                  {#if ai.summary}
                    <p class="mt-1 text-muted-foreground">{ai.summary}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Resolution Panel -->
      {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
        <Card class="border-destructive/30">
          <CardHeader>
            <CardTitle class="text-destructive">Quyết định giải quyết</CardTitle>
            <CardDescription>Giải quyết tranh chấp thủ công trực tiếp</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="decision">Quyết định cuối cùng</Label>
              <select
                id="decision"
                bind:value={finalDecision}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="dismiss_dispute">Bác bỏ khiếu nại (Dismiss)</option>
                <option value="uphold_review">Chấp nhận khiếu nại (Uphold)</option>
                <option value="partially_accept">Chấp nhận một phần (Partially Accept)</option>
                <option value="adjust_score">Điều chỉnh điểm số trực tiếp</option>
                <option value="request_re_review">Yêu cầu đánh giá lại</option>
              </select>
            </div>

            <div class="space-y-2">
              <Label for="profile-action">Hành động cập nhật Profile</Label>
              <select
                id="profile-action"
                bind:value={profileUpdateAction}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="no_action">Giữ nguyên, không cập nhật lại profile</option>
                <option value="recalculate_after_adjustment">Tính toán lại Profile người làm (Recalculate)</option>
              </select>
            </div>

            <div class="space-y-2">
              <Label for="credibility-action">Hành động với Reviewer</Label>
              <select
                id="credibility-action"
                bind:value={reviewerCredibilityAction}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="no_action">Không tác động uy tín reviewer</option>
                <option value="mark_disputed_review">Giảm điểm uy tín Reviewer (Penalize)</option>
              </select>
            </div>

            <div class="space-y-2">
              <Label for="rationale">Giải trình quyết định giải quyết <span class="text-destructive">*</span></Label>
              <Textarea
                id="rationale"
                bind:value={finalRationale}
                placeholder="Nhập lý do chi tiết giải quyết khiếu nại..."
                rows={3}
              />
            </div>

            <Button
              variant="destructive"
              class="w-full"
              onclick={resolveDispute}
              disabled={resolving || !finalRationale.trim()}
            >
              {resolving ? 'Đang thực thi...' : 'Ban hành quyết định'}
            </Button>
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
</div>
