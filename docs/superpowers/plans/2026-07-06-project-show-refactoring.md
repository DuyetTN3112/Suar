# Project Show Page Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic `inertia/pages/projects/show.svelte` file (~1421 lines) by extracting Details, Members, and Staffing sections into decoupled Svelte 5 components.

**Architecture:** Create dedicated components for details, members management, and automated staffing, reducing the parent file size to under 250 lines and localizing feature-specific state.

**Tech Stack:** Svelte 5, InertiaJS Svelte, Axios, TailwindCSS.

## Global Constraints

- No placeholder comments in code blocks.
- Follow Svelte 5 rules for props and bindings.
- Do NOT perform git commits (user will manage commits).

---

### Task 1: Create `ProjectDetailsTab` component

**Files:**
- Create: `inertia/pages/projects/components/project_details_tab.svelte`

- [ ] **Step 1: Write `project_details_tab.svelte` file**

Write the file content:
```html
<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'

  interface Props {
    projectState: any
    editing: boolean
    saving: boolean
    deleting: boolean
    editForm: any
    memberCount: number
    projectTaskSummary: any
    membersWithDeliveryRole: any[]
    staffedProfessionalRoleCount: number
    activeProfessionalRoles: any[]
    membersWithoutDeliveryRole: any[]
    unstaffedProfessionalRoles: any[]
    permissions: any
    formatDate: (d: string) => string
    t: any
  }

  let {
    projectState = $bindable(),
    editing = $bindable(),
    saving,
    deleting,
    editForm = $bindable(),
    memberCount,
    projectTaskSummary,
    membersWithDeliveryRole,
    staffedProfessionalRoleCount,
    activeProfessionalRoles,
    membersWithoutDeliveryRole,
    unstaffedProfessionalRoles,
    permissions,
    formatDate,
    t,
  }: Props = $props()
</script>

<Card>
  <CardContent class="pt-6">
    <div class="mb-6 grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thành viên</p>
        <p class="mt-2 text-2xl font-black text-foreground">{memberCount}</p>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task đang chạy</p>
        <p class="mt-2 text-2xl font-black text-foreground">{projectTaskSummary.in_progress}</p>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task trễ</p>
        <p class="mt-2 text-2xl font-black text-primary">{projectTaskSummary.overdue}</p>
      </div>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-border bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery coverage</p>
        <p class="mt-2 text-2xl font-black text-foreground">
          {membersWithDeliveryRole.length}/{memberCount}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role coverage</p>
        <p class="mt-2 text-2xl font-black text-foreground">
          {staffedProfessionalRoleCount}/{activeProfessionalRoles.length}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-white p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Need staffing</p>
        <p class="mt-2 text-2xl font-black text-primary">
          {Math.max(unstaffedProfessionalRoles.length, membersWithoutDeliveryRole.length)}
        </p>
      </div>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <p class="text-sm font-semibold text-foreground">Coverage by role</p>
        <div class="mt-4 flex flex-wrap gap-2">
          {#if activeProfessionalRoles.length === 0}
            <span class="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
              Chưa có professional role
            </span>
          {:else}
            {#each activeProfessionalRoles as role}
              {@const assignedCount = membersWithoutDeliveryRole.concat(membersWithDeliveryRole).filter((member) => member.project_professional_role_id === role.id).length}
              <span class={`rounded-full px-3 py-1 text-xs font-medium ${assignedCount > 0 ? 'bg-primary/10 text-foreground' : 'border border-dashed border-border text-muted-foreground'}`}>
                {role.name} · {assignedCount > 0 ? `${assignedCount} người` : 'chưa có owner'}
              </span>
            {/each}
          {/if}
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <p class="text-sm font-semibold text-foreground">Staffing status</p>
        <div class="mt-4 space-y-2 text-sm text-muted-foreground">
          {#if membersWithoutDeliveryRole.length > 0}
            <p>{membersWithoutDeliveryRole.length} thành viên chưa có delivery role.</p>
          {/if}
          {#if unstaffedProfessionalRoles.length > 0}
            <p>{unstaffedProfessionalRoles.length} professional role chưa có owner.</p>
          {/if}
          {#if membersWithoutDeliveryRole.length === 0 && unstaffedProfessionalRoles.length === 0}
            <p>Đã đủ để tiếp tục tạo task.</p>
          {/if}
        </div>
      </div>
    </div>

    <h2 class="mb-4 text-lg font-semibold">Thông tin dự án</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Mô tả</p>
        {#if editing}
          <Textarea
            value={editForm.description}
            rows={4}
            oninput={(event: Event) => {
              editForm.description = (event.currentTarget as HTMLTextAreaElement).value
            }}
          />
        {:else}
          <p>{projectState.description ?? 'Không có'}</p>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Trạng thái</p>
        {#if editing}
          <select bind:value={editForm.status} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="pending">Chờ duyệt</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        {:else}
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-06 text-foreground">
            {projectState.status ?? 'Không có'}
          </div>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Ngày bắt đầu</p>
        <p>{projectState.start_date ? formatDate(projectState.start_date) : 'Không có'}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Ngày kết thúc</p>
        <p>{projectState.end_date ? formatDate(projectState.end_date) : 'Không có'}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Người tạo</p>
        <p>{projectState.creator_name ?? 'Không có'}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">Quản lý</p>
        <p>{projectState.manager_name ?? 'Không có'}</p>
      </div>
    </div>
    {#if editing}
      <div class="mt-4 space-y-2">
        <Label for="project-name">Tên dự án</Label>
        <Input
          id="project-name"
          value={editForm.name}
          oninput={(event: Event) => {
            editForm.name = (event.currentTarget as HTMLInputElement).value
          }}
        />
      </div>
    {/if}
  </CardContent>
</Card>
```

---

### Task 2: Create `ProjectMembersTab` component

**Files:**
- Create: `inertia/pages/projects/components/project_members_tab.svelte`

- [ ] **Step 1: Write `project_members_tab.svelte` file**

Write the file content:
```html
<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import ProjectMemberCard from './project_member_card.svelte'
  import ProjectMemberSetupPreview from './project_member_setup_preview.svelte'

  interface Props {
    projectId: string
    members: any[]
    permissions: any
    projectProfessionalRoles: any[]
    loadingProjectRoles: boolean
    getMemberInitials: (member: any) => string
    t: any
    onUpdateMemberRole: (userId: string, newRole: string, professionalRoleId?: string | null) => void
    onRemoveMember: (userId: string) => void
  }

  let {
    projectId,
    members,
    permissions,
    projectProfessionalRoles,
    loadingProjectRoles,
    getMemberInitials,
    t,
    onUpdateMemberRole,
    onRemoveMember,
  }: Props = $props()

  let addMemberOpen = $state(false)
  let memberSearch = $state('')
  let newMemberUserId = $state('')
  let newMemberRole = $state('project_member')
  let newMemberProfessionalRoleId = $state('')
  let loadingCandidates = $state(false)
  let memberCandidates = $state<any[]>([])

  const selectedNewMemberCandidate = $derived(
    memberCandidates.find((candidate) => candidate.userId === newMemberUserId) ?? null
  )
  const selectedNewMemberProfessionalRole = $derived(
    projectProfessionalRoles.find((role) => role.id === newMemberProfessionalRoleId) ?? null
  )

  const membersWithoutDeliveryRole = $derived(
    members.filter((member) => !member.project_professional_role_id)
  )

  async function loadMemberCandidates() {
    loadingCandidates = true
    try {
      const params = new URLSearchParams()
      if (memberSearch.trim()) params.set('search', memberSearch.trim())
      const resp = await fetch(`/projects/${projectId}/member-candidates?${params}`)
      const result = await resp.json() as { data: any[] }
      memberCandidates = result.data
    } catch {
      memberCandidates = []
    } finally {
      loadingCandidates = false
    }
  }

  function handleAddMember(e: Event) {
    e.preventDefault()
    const userId = newMemberUserId.trim()
    if (!userId) return

    router.post(
      '/projects/members',
      {
        projectId,
        userId,
        projectRole: newMemberRole,
        projectProfessionalRoleId: newMemberProfessionalRoleId || null,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          newMemberUserId = ''
          newMemberRole = 'project_member'
          newMemberProfessionalRoleId = ''
          addMemberOpen = false
        },
      }
    )
  }

  $effect(() => {
    if (addMemberOpen && projectId) {
      void loadMemberCandidates()
    }
  })
</script>

<Card>
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle>Thành viên</CardTitle>
    {#if permissions.isCreator || permissions.isManager}
      <Button size="sm" onclick={() => { addMemberOpen = true }}>
        Thêm thành viên
      </Button>
      <Dialog open={addMemberOpen} onOpenChange={(open) => addMemberOpen = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
          </DialogHeader>
          <form onsubmit={handleAddMember} class="space-y-4">
            <div class="space-y-2">
              <Label for="member_search">Tìm thành viên tổ chức</Label>
              <Input
                id="member_search"
                type="text"
                value={memberSearch}
                oninput={(event: Event) => {
                  memberSearch = (event.currentTarget as HTMLInputElement).value
                  void loadMemberCandidates()
                }}
                placeholder="Tìm theo tên hoặc email..."
              />
            </div>
            <div class="space-y-2">
              <Label for="user_id">Chọn thành viên</Label>
              <select
                id="user_id"
                bind:value={newMemberUserId}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">-- Chọn thành viên --</option>
                {#if loadingCandidates}
                  <option disabled>Đang tải...</option>
                {:else}
                  {#each memberCandidates as candidate}
                    <option value={candidate.userId}>
                      {candidate.username} ({candidate.email}) — {candidate.orgRole}
                    </option>
                  {/each}
                  {#if memberCandidates.length === 0}
                    <option disabled>Không có thành viên khả dụng</option>
                  {/if}
                {/if}
              </select>
            </div>
            <div class="space-y-2">
              <Label for="project_role">Vai trò trong dự án</Label>
              <select
                id="project_role"
                bind:value={newMemberRole}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="project_viewer">Viewer</option>
                <option value="project_member">Member</option>
                <option value="project_manager">Manager</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="project_professional_role">Professional role phụ trách</Label>
              <select
                id="project_professional_role"
                bind:value={newMemberProfessionalRoleId}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Chưa gán delivery role --</option>
                {#if loadingProjectRoles}
                  <option disabled>Đang tải role...</option>
                {:else}
                  {#each projectProfessionalRoles as role}
                    <option value={role.id}>{role.name} ({role.code})</option>
                  {/each}
                {/if}
              </select>
              {#if selectedNewMemberProfessionalRole}
                <p class="text-xs text-foreground">
                  Delivery role: <span class="font-medium">{selectedNewMemberProfessionalRole.name}</span>
                </p>
              {/if}
            </div>
            {#if selectedNewMemberCandidate}
              <ProjectMemberSetupPreview
                candidate={selectedNewMemberCandidate}
                governanceRole={newMemberRole}
                deliveryRoleName={selectedNewMemberProfessionalRole?.name ?? null}
              />
            {/if}
            <Button type="submit" disabled={!newMemberUserId}>
              Thêm
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    {/if}
  </CardHeader>
  <CardContent>
    {#if membersWithoutDeliveryRole.length > 0}
      <div class="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p class="text-sm font-semibold text-foreground">Staffing clarity</p>
        <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span class="rounded-full bg-white px-2.5 py-1">
            {membersWithoutDeliveryRole.length} member chưa có delivery role
          </span>
        </div>
      </div>
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#if members.length === 0}
        <p class="col-span-full text-center py-4 text-muted-foreground">
          Chưa có thành viên nào
        </p>
      {:else}
        {#each members as member, index (`${member.user_id ?? ''}-${index}`)}
          <ProjectMemberCard
            {member}
            canManage={permissions.isCreator || permissions.isManager}
            {projectProfessionalRoles}
            {getMemberInitials}
            onUpdateMemberRole={onUpdateMemberRole}
            onRemoveMember={onRemoveMember}
          />
        {/each}
      {/if}
    </div>
  </CardContent>
</Card>
```

---

### Task 3: Create `ProjectStaffingPanel` component

**Files:**
- Create: `inertia/pages/projects/components/project_staffing_panel.svelte`

- [ ] **Step 1: Write `project_staffing_panel.svelte` file**

Write the file content:
```html
<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import TalentExplainabilityBadges from '@/components/talent_explainability_badges.svelte'
  import ProjectStaffingAutoFillPreviewItem from './project_staffing_auto_fill_preview_item.svelte'
  import ProjectStaffingAutoFillResultItem from './project_staffing_auto_fill_result_item.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  interface Props {
    projectId: string
    members: any[]
    activeProfessionalRoles: any[]
    unstaffedProfessionalRoles: any[]
    projectProfessionalRoles: any[]
    onOpenMatching: (roleId: string) => void
  }

  let {
    projectId,
    members,
    activeProfessionalRoles,
    unstaffedProfessionalRoles,
    projectProfessionalRoles,
    onOpenMatching,
  }: Props = $props()

  interface RoleCandidateSummary {
    userId: string
    username: string
    source: 'project_member' | 'org_member' | 'external'
    matchScore: number
    matchedSkills: number
    totalRequiredSkills: number
    skillGaps: string[]
    reviewedSkillsCount: number
    importedSkillsCount: number
    underDisputeSkillsCount: number
    latestConfidenceSignal: 'low' | 'medium' | 'high' | null
  }

  interface RoleCandidateInsight {
    roleId: string
    roleName: string
    roleCode: string
    totalCandidates: number
    orgMemberCandidates: number
    projectMemberCandidates: number
    topCandidate: RoleCandidateSummary | null
    topCandidates: RoleCandidateSummary[]
  }

  interface AutoFillPreviewItem {
    roleId: string
    roleName: string
    candidate: RoleCandidateSummary | null
    excluded: boolean
    actionType: 'add_member' | 'update_member' | null
  }

  interface AutoFillResultItem {
    roleId: string
    roleName: string
    candidateUserId: string | null
    candidateUsername: string | null
    actionType: 'add_member' | 'update_member' | null
    status: 'success' | 'error'
    errorMessage?: string
    reviewedSkillsCount?: number | null
    importedSkillsCount?: number | null
    underDisputeSkillsCount?: number | null
    latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
    matchedSkills?: number | null
    totalRequiredSkills?: number | null
    skillGaps?: string[]
  }

  let loadingRoleCandidateInsights = $state(false)
  let roleCandidateInsights = $state<RoleCandidateInsight[]>([])
  let autoFillExcludedRoleIds = $state<string[]>([])
  let autoFillLastResults = $state<AutoFillResultItem[]>([])
  let autoStaffing = $state(false)
  let autoFillConfirming = $state(false)
  let staffingCandidateActionKey = $state<string | null>(null)

  const autoFillPreview = $derived.by(() => {
    const seenUserIds = new Set<string>()
    const items: AutoFillPreviewItem[] = []

    for (const insight of roleCandidateInsights) {
      const candidate =
        insight.topCandidates.find(
          (item) => item.source !== 'external' && !seenUserIds.has(item.userId)
        ) ?? null

      if (candidate) {
        seenUserIds.add(candidate.userId)
      }

      items.push({
        roleId: insight.roleId,
        roleName: insight.roleName,
        candidate,
        excluded: autoFillExcludedRoleIds.includes(insight.roleId),
        actionType: candidate
          ? candidate.source === 'project_member'
            ? 'update_member'
            : candidate.source === 'org_member'
              ? 'add_member'
              : null
          : null,
      })
    }

    return items
  })

  const autoFillReadyCount = $derived(
    autoFillPreview.filter((item) => item.candidate !== null && !item.excluded).length
  )
  const autoFillExcludableRoleIds = $derived(
    autoFillPreview
      .filter((item) => item.candidate !== null)
      .map((item) => item.roleId)
  )

  const autoFillSummary = $derived.by(() => {
    let addMemberCount = 0
    let updateMemberCount = 0
    let skippedCount = 0
    let excludedCount = 0

    for (const item of autoFillPreview) {
      if (item.excluded) {
        excludedCount += 1
        continue
      }

      if (!item.candidate || item.actionType === null) {
        skippedCount += 1
        continue
      }

      if (item.actionType === 'add_member') {
        addMemberCount += 1
      } else if (item.actionType === 'update_member') {
        updateMemberCount += 1
      }
    }

    return {
      addMemberCount,
      updateMemberCount,
      skippedCount,
      excludedCount,
    }
  })

  $effect(() => {
    const currentRoleIds = new Set(roleCandidateInsights.map((insight) => insight.roleId))
    autoFillExcludedRoleIds = autoFillExcludedRoleIds.filter((roleId) => currentRoleIds.has(roleId))
  })

  $effect(() => {
    if (autoFillReadyCount === 0) {
      autoFillConfirming = false
    }
  })

  $effect(() => {
    if (!projectId || activeProfessionalRoles.length === 0) {
      roleCandidateInsights = []
      return
    }

    const rolesNeedingStaffing = unstaffedProfessionalRoles.slice(0, 3)
    if (rolesNeedingStaffing.length === 0) {
      roleCandidateInsights = []
      return
    }

    void loadRoleCandidateInsights(rolesNeedingStaffing)
  })

  async function loadRoleCandidateInsights(roles: any[]) {
    loadingRoleCandidateInsights = true
    try {
      const results = await Promise.all(
        roles.map(async (role) => {
          const response = await axios.get<{
            data: {
              role: { id: string; name: string; code: string }
              candidates: RoleCandidateSummary[]
              orgMembers?: unknown[]
              projectMembers?: unknown[]
            }
          }>(`/api/v1/projects/${projectId}/professional-roles/${role.id}/candidates`)

          const payload = response.data.data
          const candidateList = payload.candidates as RoleCandidateSummary[]
          return {
            roleId: payload.role.id,
            roleName: payload.role.name,
            roleCode: payload.role.code,
            totalCandidates: candidateList.length,
            orgMemberCandidates: payload.orgMembers?.length ?? 0,
            projectMemberCandidates: payload.projectMembers?.length ?? 0,
            topCandidate: candidateList[0] ?? null,
            topCandidates: candidateList.slice(0, 3),
          } satisfies RoleCandidateInsight
        })
      )

      roleCandidateInsights = results
    } catch {
      roleCandidateInsights = []
    } finally {
      loadingRoleCandidateInsights = false
    }
  }

  async function assignCandidateToRole(
    insight: RoleCandidateInsight,
    candidate: RoleCandidateSummary
  ): Promise<'updated_member' | 'added_member'> {
    if (candidate.source === 'external') {
      throw new Error('External candidates cannot be assigned from this flow')
    }
    const existingProjectMember = members.find(
      (member) => member.user_id === candidate.userId
    )

    if (candidate.source === 'project_member' && existingProjectMember?.user_id) {
      await axios.put(
        `/projects/members/${existingProjectMember.user_id}`,
        {
          projectId,
          projectRole: existingProjectMember.role,
          projectProfessionalRoleId: insight.roleId,
        },
        { headers: { Accept: 'application/json' } }
      )
      return 'updated_member'
    }

    await axios.post(
      '/projects/members',
      {
        projectId,
        userId: candidate.userId,
        projectRole: 'project_member',
        projectProfessionalRoleId: insight.roleId,
      },
      { headers: { Accept: 'application/json' } }
    )
    return 'added_member'
  }

  async function handleAssignCandidate(
    insight: RoleCandidateInsight,
    candidate: RoleCandidateSummary
  ) {
    if (candidate.source === 'external') return

    const actionKey = `${insight.roleId}:${candidate.userId}`
    staffingCandidateActionKey = actionKey
    try {
      const result = await assignCandidateToRole(insight, candidate)
      if (result === 'updated_member') {
        notificationStore.success(`Đã gán ${candidate.username} sang role ${insight.roleName}`)
      } else {
        notificationStore.success(`Đã thêm ${candidate.username} vào role ${insight.roleName}`)
      }
      router.reload()
    } catch {
      notificationStore.error('Không thể thêm candidate vào project')
    } finally {
      staffingCandidateActionKey = null
    }
  }

  async function handleAutoFillTopMatches() {
    autoStaffing = true
    try {
      const seenUserIds = new Set<string>()
      let appliedCount = 0
      let addedCount = 0
      let updatedCount = 0
      const appliedResults: AutoFillResultItem[] = []

      for (const previewItem of autoFillPreview) {
        if (previewItem.excluded || !previewItem.candidate) continue

        const insight = roleCandidateInsights.find((item) => item.roleId === previewItem.roleId)
        const candidate = previewItem.candidate
        if (!insight) continue

        if (seenUserIds.has(candidate.userId)) continue
        if (candidate.source === 'external') continue

        seenUserIds.add(candidate.userId)
        try {
          const result = await assignCandidateToRole(insight, candidate)
          if (result === 'updated_member') {
            updatedCount += 1
            appliedResults.push({
              roleId: insight.roleId,
              roleName: insight.roleName,
              candidateUserId: candidate.userId,
              candidateUsername: candidate.username,
              actionType: 'update_member',
              status: 'success',
              reviewedSkillsCount: candidate.reviewedSkillsCount,
              importedSkillsCount: candidate.importedSkillsCount,
              underDisputeSkillsCount: candidate.underDisputeSkillsCount,
              latestConfidenceSignal: candidate.latestConfidenceSignal,
              matchedSkills: candidate.matchedSkills,
              totalRequiredSkills: candidate.totalRequiredSkills,
              skillGaps: candidate.skillGaps,
            })
          } else {
            addedCount += 1
            appliedResults.push({
              roleId: insight.roleId,
              roleName: insight.roleName,
              candidateUserId: candidate.userId,
              candidateUsername: candidate.username,
              actionType: 'add_member',
              status: 'success',
              reviewedSkillsCount: candidate.reviewedSkillsCount,
              importedSkillsCount: candidate.importedSkillsCount,
              underDisputeSkillsCount: candidate.underDisputeSkillsCount,
              latestConfidenceSignal: candidate.latestConfidenceSignal,
              matchedSkills: candidate.matchedSkills,
              totalRequiredSkills: candidate.totalRequiredSkills,
              skillGaps: candidate.skillGaps,
            })
          }
          appliedCount += 1
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Không thể áp dụng role này'
          appliedResults.push({
            roleId: insight.roleId,
            roleName: insight.roleName,
            candidateUserId: candidate.userId,
            candidateUsername: candidate.username,
            actionType: previewItem.actionType,
            status: 'error',
            errorMessage: message,
            reviewedSkillsCount: candidate.reviewedSkillsCount,
            importedSkillsCount: candidate.importedSkillsCount,
            underDisputeSkillsCount: candidate.underDisputeSkillsCount,
            latestConfidenceSignal: candidate.latestConfidenceSignal,
            matchedSkills: candidate.matchedSkills,
            totalRequiredSkills: candidate.totalRequiredSkills,
            skillGaps: candidate.skillGaps,
          })
        }
      }

      autoFillLastResults = appliedResults

      if (appliedCount === 0) {
        const hasFailures = appliedResults.some((result) => result.status === 'error')
        notificationStore.error(
          hasFailures
            ? 'Batch staffing không áp dụng được role nào. Xem chi tiết lỗi bên dưới.'
            : 'Không có ứng viên phù hợp để auto-fill'
        )
        return
      }

      notificationStore.success(`Đã auto-fill ${appliedCount} role: ${addedCount} thêm mới, ${updatedCount} gán lại`)
      autoFillConfirming = false
      router.reload()
    } catch {
      notificationStore.error('Không thể khởi chạy batch auto-fill')
    } finally {
      autoStaffing = false
    }
  }

  async function handleRetryAutoFillResult(result: AutoFillResultItem) {
    if (!result.candidateUserId) {
      notificationStore.error('Không tìm thấy candidate để thử lại')
      return
    }

    const insight = roleCandidateInsights.find((item) => item.roleId === result.roleId)
    const candidate = insight?.topCandidates.find((item) => item.userId === result.candidateUserId)

    if (!insight || !candidate) {
      notificationStore.error('Candidate hiện không còn trong shortlist. Mở matching chi tiết để chọn lại.')
      return
    }

    await handleAssignCandidate(insight, candidate)
  }

  function toggleAutoFillRole(roleId: string) {
    autoFillExcludedRoleIds = autoFillExcludedRoleIds.includes(roleId)
      ? autoFillExcludedRoleIds.filter((id) => id !== roleId)
      : [...autoFillExcludedRoleIds, roleId]
  }

  function includeAllAutoFillRoles() {
    autoFillExcludedRoleIds = []
  }

  function excludeAllAutoFillRoles() {
    autoFillExcludedRoleIds = [...autoFillExcludableRoleIds]
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Staffing</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if loadingRoleCandidateInsights}
      <p class="text-sm text-muted-foreground">Đang tải ứng viên...</p>
    {:else if roleCandidateInsights.length === 0}
      <div class="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Chưa có candidate phù hợp.
      </div>
    {:else}
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-foreground">Xem trước auto-fill</p>
            <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span class="rounded-full bg-white/80 px-2.5 py-1">
                {autoFillSummary.addMemberCount} thêm mới
              </span>
              <span class="rounded-full bg-white/80 px-2.5 py-1">
                {autoFillSummary.updateMemberCount} gán lại
              </span>
              <span class="rounded-full bg-white/80 px-2.5 py-1">
                {autoFillSummary.skippedCount} skip vì chưa có match an toàn
              </span>
              <span class="rounded-full bg-white/80 px-2.5 py-1">
                {autoFillSummary.excludedCount} đang loại khỏi batch
              </span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onclick={includeAllAutoFillRoles}
              disabled={autoFillExcludedRoleIds.length === 0}
            >
              Chọn lại toàn bộ
            </Button>
            <Button
              variant="outline"
              onclick={excludeAllAutoFillRoles}
              disabled={autoFillExcludableRoleIds.length === 0 || autoFillReadyCount === 0}
            >
              Bỏ chọn toàn bộ
            </Button>
            <Button
              onclick={() => { autoFillConfirming = true }}
              disabled={autoStaffing || autoFillReadyCount === 0}
            >
              {autoStaffing ? 'Đang auto-fill...' : `Chuẩn bị auto-fill ${autoFillReadyCount} role`}
            </Button>
            <Button variant="outline" onclick={() => onOpenMatching('')}>Rà từng role</Button>
          </div>
        </div>

        {#if autoFillConfirming && autoFillReadyCount > 0}
          <div class="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p class="text-sm font-semibold text-foreground">Xác nhận auto-fill</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button onclick={() => { void handleAutoFillTopMatches() }} disabled={autoStaffing}>
                {autoStaffing ? 'Đang áp dụng...' : 'Xác nhận & áp dụng'}
              </Button>
              <Button variant="outline" onclick={() => { autoFillConfirming = false }} disabled={autoStaffing}>
                Hủy batch
              </Button>
            </div>
          </div>
        {/if}

        {#if autoFillPreview.length > 0}
          <div class="mt-4 grid gap-2 lg:grid-cols-2">
            {#each autoFillPreview as item (item.roleId)}
              <ProjectStaffingAutoFillPreviewItem {item} onToggle={toggleAutoFillRole} />
            {/each}
          </div>
        {/if}

        {#if autoFillLastResults.length > 0}
          <div class="mt-4 rounded-2xl border border-border bg-white/70 p-4">
            <p class="text-sm font-semibold text-foreground">Kết quả batch gần nhất</p>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              {#each autoFillLastResults as result (`${result.roleId}-${result.candidateUsername}`)}
                <ProjectStaffingAutoFillResultItem
                  {result}
                  onRetry={(roleId) => {
                    const target = autoFillLastResults.find((item) => item.roleId === roleId)
                    if (target) { void handleRetryAutoFillResult(target) }
                  }}
                  onOpenMatching={onOpenMatching}
                />
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        {#each roleCandidateInsights as insight (insight.roleId)}
          <div class="rounded-2xl border border-border bg-secondary/20 p-4">
            <p class="text-sm font-semibold text-foreground">{insight.roleName}</p>
            <p class="mt-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">{insight.roleCode}</p>
            <div class="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{insight.totalCandidates} ứng viên</p>
              <p>{insight.orgMemberCandidates} ngoài project</p>
              <p>{insight.projectMemberCandidates} trong project</p>
            </div>
            {#if insight.topCandidate}
              <div class="mt-3 rounded-xl border border-primary/10 bg-white/80 p-3 text-sm">
                <p class="font-medium text-foreground">{insight.topCandidate.username}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {insight.topCandidate.matchScore}% · {insight.topCandidate.source}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {insight.topCandidate.matchedSkills}/{insight.topCandidate.totalRequiredSkills} skill
                </p>
                <TalentExplainabilityBadges
                  reviewedSkillsCount={insight.topCandidate.reviewedSkillsCount}
                  importedSkillsCount={insight.topCandidate.importedSkillsCount}
                  underDisputeSkillsCount={insight.topCandidate.underDisputeSkillsCount}
                  latestConfidenceSignal={insight.topCandidate.latestConfidenceSignal}
                  containerClass="mt-2 flex flex-wrap gap-1"
                  badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
                />
                {#if insight.topCandidate.skillGaps.length > 0}
                  <p class="mt-1 text-xs text-muted-foreground">Gap: {insight.topCandidate.skillGaps.join(', ')}</p>
                {/if}
              </div>
            {/if}

            {#if insight.topCandidates.length > 0}
              <div class="mt-3 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Danh sách</p>
                {#each insight.topCandidates as candidate (`${insight.roleId}-${candidate.userId}`)}
                  {@const isBusy = staffingCandidateActionKey === `${insight.roleId}:${candidate.userId}`}
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/70 p-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">{candidate.username}</p>
                      <p class="mt-1 text-xs text-muted-foreground">{candidate.matchScore}% · {candidate.source}</p>
                      <TalentExplainabilityBadges
                        reviewedSkillsCount={candidate.reviewedSkillsCount}
                        importedSkillsCount={candidate.importedSkillsCount}
                        underDisputeSkillsCount={candidate.underDisputeSkillsCount}
                        latestConfidenceSignal={candidate.latestConfidenceSignal}
                        containerClass="mt-2 flex flex-wrap gap-1"
                        badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
                      />
                    </div>
                    <Button
                      size="sm"
                      onclick={() => { void handleAssignCandidate(insight, candidate) }}
                      disabled={candidate.source === 'external' || isBusy}
                    >
                      {isBusy ? 'Đang xử lý...' : 'Gán'}
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onclick={() => onOpenMatching(insight.roleId)}>Mở role</Button>
              <Button size="sm" variant="outline" onclick={() => router.visit(`/org/talents?project_id=${projectId}`)}>Talent pool</Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>
```

---

### Task 4: Refactor `projects/show.svelte`

**Files:**
- Modify: `inertia/pages/projects/show.svelte`

- [ ] **Step 1: Write refactored `show.svelte` code**

Replace file content of `show.svelte` with:
```html
<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'

  import ConfirmDialog from '@/components/confirm_dialog.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { formatDate } from '@/lib/utils'
  import { notificationStore } from '@/stores/notification_store.svelte'

  import ProjectDetailsTab from './components/project_details_tab.svelte'
  import ProjectMembersTab from './components/project_members_tab.svelte'
  import ProjectStaffingPanel from './components/project_staffing_panel.svelte'
  import ProjectRolesTab from './components/project_roles_tab.svelte'
  import ProjectSkillsTab from './components/project_skills_tab.svelte'
  import type { ProjectShowProps } from './types'

  type ProjectTab = 'details' | 'members' | 'skills' | 'roles'

  interface ProfessionalRoleOption {
    id: string
    name: string
    code: string
    isActive?: boolean
  }

  const {
    project,
    members,
    tasks,
    tasks_summary,
    permissions,
    shellMode = 'app',
    baseRoute = FRONTEND_ROUTES.PROJECTS,
  }: ProjectShowProps = $props()

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const safeMembers = $derived(members)
  const memberCount = $derived(safeMembers.length)
  const projectTaskSummary = $derived(tasks_summary ?? {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  })

  let confirmDialogOpen = $state(false)
  let confirmAction = $state<'delete_project' | 'remove_member' | null>(null)
  let pendingMemberRemovalUserId = $state<string | null>(null)
  let projectProfessionalRoles = $state<ProfessionalRoleOption[]>([])
  let loadingProjectRoles = $state(false)
  let projectRolesHydratedForProjectId = $state<string | null>(null)
  let activeTab = $state<ProjectTab>('details')
  let syncedProjectId = $state<string | null>(null)
  let appliedFocusMode = $state<string | null | undefined>(undefined)
  let editing = $state(false)
  let saving = $state(false)
  let deleting = $state(false)

  let projectState = $state<ProjectShowProps['project']>({
    id: '',
    name: '',
    organization_id: '',
    creator_id: '',
    created_at: '',
    updated_at: '',
    description: '',
    organization_name: '',
    creator_name: '',
    manager_id: '',
    manager_name: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    visibility: 'team',
  })

  const editForm = $state({
    name: '',
    description: '',
    status: 'pending',
  })

  const focusMode = $derived(
    new URLSearchParams(page.url.split('?')[1] ?? '').get('focus')
  )
  const activeProfessionalRoles = $derived(projectProfessionalRoles.filter((role) => role.isActive !== false))
  const staffedProfessionalRoleIds = $derived(
    [...new Set(
      safeMembers
        .map((member) => member.project_professional_role_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )]
  )
  const staffedProfessionalRoleCount = $derived(
    activeProfessionalRoles.filter((role) => staffedProfessionalRoleIds.includes(role.id)).length
  )
  const membersWithDeliveryRole = $derived(
    safeMembers.filter((member) => typeof member.project_professional_role_id === 'string' && member.project_professional_role_id.length > 0)
  )
  const membersWithoutDeliveryRole = $derived(
    safeMembers.filter((member) => !member.project_professional_role_id)
  )
  const unstaffedProfessionalRoles = $derived(
    activeProfessionalRoles.filter((role) => !staffedProfessionalRoleIds.includes(role.id))
  )

  let candidateFocusRoleId = $state<string | null>(null)
  let candidateFocusKey = $state<string | null>(null)

  $effect(() => {
    if (project.id && syncedProjectId !== project.id) {
      projectState = { ...project }
      syncedProjectId = project.id
    }
  })

  $effect(() => {
    if (!editing) {
      editForm.name = projectState.name
      editForm.description = projectState.description ?? ''
      editForm.status = projectState.status ?? 'pending'
    }
  })

  $effect(() => {
    if (appliedFocusMode !== focusMode) {
      appliedFocusMode = focusMode
      let nextTab: ProjectTab = 'details'
      if (focusMode === 'members') nextTab = 'members'
      else if (focusMode === 'roles') nextTab = 'roles'
      activeTab = nextTab
    }
  })

  $effect(() => {
    if (project.id && projectRolesHydratedForProjectId !== project.id && !loadingProjectRoles) {
      void loadProjectProfessionalRoles()
    }
  })

  async function loadProjectProfessionalRoles() {
    if (!project.id) {
      projectProfessionalRoles = []
      return
    }
    loadingProjectRoles = true
    try {
      const response = await axios.get<{ data: ProfessionalRoleOption[] }>(
        `/api/v1/projects/${project.id}/professional-roles`
      )
      projectProfessionalRoles = response.data.data.filter((role) => role.isActive !== false)
    } catch {
      projectProfessionalRoles = []
    } finally {
      projectRolesHydratedForProjectId = project.id
      loadingProjectRoles = false
    }
  }

  function getMemberInitials(member: any): string {
    const fromUsername = member.username ? member.username.charAt(0).toUpperCase() : ''
    const fromEmail = member.email ? member.email.charAt(0).toUpperCase() : ''
    return fromUsername || fromEmail || '?'
  }

  async function handleDeleteProject() {
    deleting = true
    try {
      await axios.delete(`/api/v1/projects/${project.id}`)
      confirmDialogOpen = false
      confirmAction = null
      router.visit(baseRoute)
    } catch {
      notificationStore.error('Không thể xóa dự án')
    } finally {
      deleting = false
    }
  }

  async function handleSaveProject() {
    if (!editForm.name.trim()) {
      notificationStore.error('Tên dự án là bắt buộc')
      return
    }
    saving = true
    try {
      await axios.patch(`/api/v1/projects/${project.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
      })
      projectState = {
        ...projectState,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        status: editForm.status,
      }
      editing = false
      notificationStore.success('Đã cập nhật dự án')
    } catch {
      notificationStore.error('Không thể cập nhật dự án')
    } finally {
      saving = false
    }
  }

  function handleUpdateMemberRole(userId: string, newRole: string, professionalRoleId?: string | null) {
    router.put(
      `/projects/members/${userId}`,
      {
        projectId: project.id,
        projectRole: newRole,
        projectProfessionalRoleId: professionalRoleId ?? null,
      },
      { preserveState: true, preserveScroll: true }
    )
  }

  function handleRemoveMember(userId: string) {
    pendingMemberRemovalUserId = userId
    confirmAction = 'remove_member'
    confirmDialogOpen = true
  }

  function requestDeleteProject() {
    confirmAction = 'delete_project'
    confirmDialogOpen = true
  }

  function confirmPendingAction() {
    if (confirmAction === 'delete_project') {
      void handleDeleteProject()
      return
    }
    if (!pendingMemberRemovalUserId) return
    router.delete(
      `/projects/members/${pendingMemberRemovalUserId}`,
      {
        data: { projectId: project.id },
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          confirmDialogOpen = false
          confirmAction = null
          pendingMemberRemovalUserId = null
        },
      }
    )
  }

  function openRoleMatching(roleId: string) {
    activeTab = 'roles'
    if (roleId) {
      candidateFocusRoleId = roleId
      candidateFocusKey = `${roleId}:${Date.now()}`
    }
  }
</script>

<svelte:head>
  <title>{projectState.name}</title>
</svelte:head>

<Layout title={projectState.name}>
  <div class="space-y-6 p-4 sm:p-6">
    <div class="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-suar-xs sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
          {shellMode === 'organization' ? 'Org project detail' : 'User project detail'}
        </p>
        <h1 class="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">{projectState.name}</h1>
        <p class="mt-2 text-sm text-muted-foreground">{projectState.organization_name}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        {#if permissions.canEdit}
          {#if editing}
            <Button variant="outline" onclick={() => { editing = false }} disabled={saving || deleting}>
              Hủy sửa
            </Button>
            <Button onclick={() => { void handleSaveProject() }} disabled={saving || deleting}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          {:else}
            <Button variant="outline" onclick={() => { editing = true }} disabled={deleting}>
              Sửa
            </Button>
          {/if}
        {/if}
        {#if permissions.canDelete}
          <Button variant="destructive" onclick={requestDeleteProject} disabled={deleting || saving}>
            Xóa
          </Button>
        {/if}
      </div>
    </div>

    {#if shellMode === 'organization' && unstaffedProfessionalRoles.length > 0}
      <ProjectStaffingPanel
        projectId={project.id}
        members={safeMembers}
        {activeProfessionalRoles}
        {unstaffedProfessionalRoles}
        {projectProfessionalRoles}
        onOpenMatching={openRoleMatching}
      />
    {/if}

    <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as ProjectTab }}>
      <TabsList>
        <TabsTrigger value="details">Tổng quan</TabsTrigger>
        <TabsTrigger value="members">Thành viên</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
        <ProjectDetailsTab
          bind:projectState
          bind:editing
          saving={saving}
          deleting={deleting}
          bind:editForm
          {memberCount}
          {projectTaskSummary}
          {membersWithDeliveryRole}
          {staffedProfessionalRoleCount}
          {activeProfessionalRoles}
          {membersWithoutDeliveryRole}
          {unstaffedProfessionalRoles}
          {permissions}
          {formatDate}
          t={notificationStore}
        />
      </TabsContent>

      <TabsContent value="members" class="mt-4">
        <ProjectMembersTab
          projectId={project.id}
          members={safeMembers}
          {permissions}
          {projectProfessionalRoles}
          {loadingProjectRoles}
          {getMemberInitials}
          t={notificationStore}
          onUpdateMemberRole={handleUpdateMemberRole}
          onRemoveMember={handleRemoveMember}
        />
      </TabsContent>

      <TabsContent value="skills" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectSkillsTab
              projectId={project.id}
              canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roles" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectRolesTab
              projectId={project.id}
              canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
              taskLaunchBaseUrl={shellMode === 'organization' ? '/org/tasks/board' : FRONTEND_ROUTES.TASKS}
              {candidateFocusRoleId}
              {candidateFocusKey}
              projectMembers={safeMembers.map((member) => ({
                userId: member.user_id ?? null,
                role: member.role ?? null,
                professionalRoleName: member.professional_role_name ?? null,
              }))}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</Layout>

<ConfirmDialog
  bind:open={confirmDialogOpen}
  title={confirmAction === 'delete_project' ? 'Xóa dự án' : 'Xóa thành viên khỏi dự án'}
  desc={
    confirmAction === 'delete_project'
      ? 'Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác.'
      : 'Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?'
  }
  cancelBtnText="Hủy"
  confirmText="Xác nhận"
  destructive={true}
  handleConfirm={confirmPendingAction}
  isLoading={deleting}
/>
```

---

### Task 5: Verification

- [ ] **Step 1: Run svelte-check**

Run: `pnpm run svelte-check`
Expected: All newly refactored project components compile cleanly.
