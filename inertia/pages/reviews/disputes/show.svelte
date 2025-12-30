<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  import { router, Link } from '@inertiajs/svelte'
  import axios from 'axios'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
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
  }

  interface Comment {
    id: string
    author_id: string
    body: string
    created_at: string
    author_context: string | null
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

  interface Props {
    dispute: Dispute
    comments: Comment[]
    evidences: Evidence[]
    authorContext: string | null
    canRespond: boolean
  }

  const { dispute, comments, evidences, authorContext: _authorContext, canRespond }: Props = $props()

  // Message/Comment states
  let commentBody = $state('')
  let postingComment = $state(false)

  // Evidence states
  let showEvidenceForm = $state(false)
  let evidenceType = $state('pull_request')
  let evidenceUrl = $state('')
  let evidenceTitle = $state('')
  let evidenceDesc = $state('')
  let uploadingEvidence = $state(false)

  // Org response states
  let showResponseForm = $state(false)
  let orgPosition = $state<'agree' | 'disagree'>('disagree')
  let orgSummary = $state('')
  let submittingResponse = $state(false)

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
      successMsg = 'Đã gửi bình luận.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi gửi bình luận.'
    } finally {
      postingComment = false
    }
  }

  async function addEvidence() {
    if (!evidenceUrl.trim() || !evidenceTitle.trim() || uploadingEvidence) return
    uploadingEvidence = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/reviews/disputes/${dispute.id}/evidences`, {
        evidence_type: evidenceType,
        url: evidenceUrl.trim(),
        title: evidenceTitle.trim(),
        description: evidenceDesc.trim() || undefined,
      })
      evidenceUrl = ''
      evidenceTitle = ''
      evidenceDesc = ''
      showEvidenceForm = false
      router.reload({ only: ['evidences'] })
      successMsg = 'Đã tải lên minh chứng mới.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi tải minh chứng.'
    } finally {
      uploadingEvidence = false
    }
  }

  async function submitOrgResponse() {
    if (!orgSummary.trim() || submittingResponse) return
    submittingResponse = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/org/reviews/disputes/${dispute.id}/respond`, {
        position: orgPosition,
        summary: orgSummary.trim(),
      })
      showResponseForm = false
      router.reload()
      successMsg = 'Đã gửi phản hồi giải trình của Tổ chức thành công.'
    } catch (err: any) {
      errorMsg = err.response?.data?.errors?.[0]?.message ?? 'Lỗi gửi phản hồi.'
    } finally {
      submittingResponse = false
    }
  }

  const statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } | undefined> = {
    pending: { label: 'Đang chờ xử lý', variant: 'secondary' },
    collecting_evidence: { label: 'Đang thu thập minh chứng', variant: 'outline' },
    admin_reviewing: { label: 'Admin đang xem xét', variant: 'default' },
    ai_reviewing: { label: 'AI đang phân tích', variant: 'outline' },
    resolved: { label: 'Đã giải quyết', variant: 'default' },
    rejected: { label: 'Bị từ chối', variant: 'destructive' },
    cancelled: { label: 'Đã hủy', variant: 'outline' },
  }

  const roleMap: Record<string, string> = {
    system_admin: 'Admin hệ thống',
    reviewee: 'Người làm (Reviewee)',
    reviewer: 'Người đánh giá (Reviewer)',
    org_owner: 'Đại diện Org (Owner)',
    org_admin: 'Đại diện Org (Admin)',
    project_manager: 'Project Manager',
  }
</script>

<svelte:head>
  <title>Chi tiết khiếu nại review</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Workspace / Reviews / Disputes</p>
      <h1 class="text-4xl font-bold tracking-tight">Chi tiết Tranh chấp review</h1>
      <p class="mt-2 text-sm text-muted-foreground">Khu vực theo dõi tiến trình và thảo luận khiếu nại điểm đánh giá.</p>
    </div>
    <Link href="/my-reviews">
      <Button variant="outline">Quay lại danh sách review</Button>
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

  <!-- Admin Decision Highlight Card -->
  {#if dispute.status === 'resolved'}
    <Card class="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader>
        <CardTitle class="text-emerald-600 flex items-center gap-2">
          <span>Quyết định từ Admin Hệ Thống</span>
          <Badge variant="default">Resolved</Badge>
        </CardTitle>
        <CardDescription>Kết quả giải quyết tranh chấp chính thức.</CardDescription>
      </CardHeader>
      <CardContent class="text-sm space-y-2">
        <p><span class="font-bold text-foreground">Kết quả:</span> {dispute.final_decision}</p>
        <p><span class="font-bold text-foreground">Giải trình chi tiết của Admin:</span></p>
        <div class="p-3 bg-paper border border-line whitespace-pre-wrap">{dispute.final_rationale}</div>
      </CardContent>
    </Card>
  {/if}

  <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <!-- Left Column: Info & Message Thread -->
    <div class="space-y-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Nội dung khiếu nại</CardTitle>
            <CardDescription>Báo cáo do người làm gửi lên</CardDescription>
          </div>
          <Badge variant={statusMap[dispute.status]?.variant ?? 'outline'}>
            {statusMap[dispute.status]?.label ?? dispute.status}
          </Badge>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div>
            <p class="text-muted-foreground font-semibold">Tên Nhiệm vụ</p>
            <p class="font-medium text-base mt-1">{dispute.task_title ?? 'Task không rõ'}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="text-muted-foreground font-semibold">Người khiếu nại</p>
              <p class="font-medium">{dispute.reviewee_username ?? 'Không rõ'}</p>
            </div>
            <div>
              <p class="text-muted-foreground font-semibold">Kết quả mong muốn</p>
              <Badge variant="outline">{dispute.requested_outcome}</Badge>
            </div>
          </div>
          <div>
            <p class="text-muted-foreground font-semibold">Mô tả lý do từ Reviewee</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-white font-medium text-foreground">
              {dispute.dispute_reason}
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Message Chat Thread -->
      <Card>
        <CardHeader>
          <CardTitle>Trao đổi thảo luận ({comments.length})</CardTitle>
          <CardDescription>Hội thoại trực tiếp giữa Người làm, Tổ chức và Admin</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          {#if comments.length === 0}
            <p class="text-sm text-muted-foreground text-center py-4">Chưa có thảo luận nào.</p>
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
              <Label for="comment-text">Viết phản hồi</Label>
              <Textarea
                id="comment-text"
                bind:value={commentBody}
                placeholder="Nhập ý kiến, phản bác hoặc thông tin bổ sung của bạn..."
                rows={3}
              />
              <Button size="sm" onclick={postComment} disabled={postingComment || !commentBody.trim()}>
                {postingComment ? 'Đang gửi...' : 'Gửi phản hồi'}
              </Button>
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Right Column: Evidence, Org Response Form -->
    <div class="space-y-6">
      <!-- Evidence Box -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Bằng chứng đính kèm</CardTitle>
            <CardDescription>PR links, demo hoặc file đính kèm</CardDescription>
          </div>
          {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
            <Button size="sm" variant="outline" onclick={() => { showEvidenceForm = !showEvidenceForm }}>
              {showEvidenceForm ? 'Đóng' : 'Thêm'}
            </Button>
          {/if}
        </CardHeader>
        <CardContent class="space-y-4">
          {#if showEvidenceForm}
            <form onsubmit={(e) => { e.preventDefault(); void addEvidence(); }} class="space-y-3 p-3 border border-line bg-paper text-sm">
              <div class="space-y-1">
                <Label for="ev-title">Tiêu đề minh chứng <span class="text-destructive">*</span></Label>
                <Input id="ev-title" type="text" bind:value={evidenceTitle} placeholder="VD: Merged Pull Request" />
              </div>
              <div class="space-y-1">
                <Label for="ev-type">Loại</Label>
                <select id="ev-type" bind:value={evidenceType} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="pull_request">Pull Request Link</option>
                  <option value="demo">Demo Web/App Link</option>
                  <option value="document">Tài liệu bổ sung</option>
                  <option value="screenshot">Ảnh chụp màn hình</option>
                </select>
              </div>
              <div class="space-y-1">
                <Label for="ev-url">URL minh chứng <span class="text-destructive">*</span></Label>
                <Input id="ev-url" type="text" bind:value={evidenceUrl} placeholder="https://github.com/.../pull/..." />
              </div>
              <div class="space-y-1">
                <Label for="ev-desc">Mô tả ngắn</Label>
                <Textarea id="ev-desc" bind:value={evidenceDesc} placeholder="Mô tả minh chứng này chứng minh điều gì..." rows={2} />
              </div>
              <Button type="submit" size="sm" class="w-full" disabled={uploadingEvidence || !evidenceUrl.trim() || !evidenceTitle.trim()}>
                {uploadingEvidence ? 'Đang gửi...' : 'Xác nhận thêm'}
              </Button>
            </form>
          {/if}

          {#if evidences.length === 0}
            <p class="text-sm text-muted-foreground">Chưa có minh chứng nào.</p>
          {:else}
            <div class="space-y-2">
              {#each evidences as ev (ev.id)}
                <div class="border border-border rounded-lg p-3 bg-white text-xs">
                  <p class="font-bold text-foreground">{ev.title ?? ev.evidence_type}</p>
                  {#if ev.description}
                    <p class="text-muted-foreground mt-1">{ev.description}</p>
                  {/if}
                  <a href={ev.url} target="_blank" rel="noreferrer" class="text-foreground inline-block mt-2 hover:underline">
                    Xem minh chứng ↗
                  </a>
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Org Response Panel -->
      {#if canRespond && dispute.status !== 'resolved' && dispute.status !== 'rejected'}
        <Card class="border-primary/30">
          <CardHeader class="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Giải trình của Tổ chức</CardTitle>
              <CardDescription>Phản hồi bảo vệ điểm số review của tổ chức</CardDescription>
            </div>
            <Button size="sm" onclick={() => { showResponseForm = !showResponseForm }}>
              {showResponseForm ? 'Đóng' : 'Mở Panel'}
            </Button>
          </CardHeader>
          <CardContent class="space-y-4">
            {#if showResponseForm}
              <form onsubmit={(e) => { e.preventDefault(); void submitOrgResponse(); }} class="space-y-4 text-sm">
                <div class="space-y-2">
                  <Label>Quan điểm của tổ chức</Label>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 font-medium cursor-pointer">
                      <input type="radio" name="org-position" value="agree" bind:group={orgPosition} />
                      Đồng ý điều chỉnh
                    </label>
                    <label class="flex items-center gap-2 font-medium cursor-pointer">
                      <input type="radio" name="org-position" value="disagree" bind:group={orgPosition} />
                      Giữ nguyên điểm số
                    </label>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label for="org-summary">Bản giải trình chi tiết <span class="text-destructive">*</span></Label>
                  <Textarea
                    id="org-summary"
                    bind:value={orgSummary}
                    placeholder="Mô tả lý do tổ chức giữ nguyên điểm hoặc các bằng chứng về việc người làm giao việc chậm/thiếu..."
                    rows={4}
                  />
                </div>

                <Button type="submit" class="w-full" disabled={submittingResponse || !orgSummary.trim()}>
                  {submittingResponse ? 'Đang gửi...' : 'Gửi giải trình chính thức'}
                </Button>
              </form>
            {:else}
              <p class="text-xs text-muted-foreground">Bạn có quyền đại diện tổ chức giải trình khiếu nại này trước khi Admin ra quyết định.</p>
            {/if}
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
</div>
