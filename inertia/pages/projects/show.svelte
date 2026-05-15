<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'
  import axios from 'axios'

  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
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
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { formatDate } from '@/lib/utils'
  import { notificationStore } from '@/stores/notification_store.svelte'

  import ProjectRolesTab from './components/project_roles_tab.svelte'
  import ProjectSkillsTab from './components/project_skills_tab.svelte'
  import type { ProjectShowProps } from './types'

  const {
    project,
    members,
    tasks,
    permissions,
    shellMode = 'app',
    baseRoute = FRONTEND_ROUTES.PROJECTS,
  }: ProjectShowProps = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const safeTasks = $derived(tasks)
  const safeMembers = $derived(members)

  let addMemberOpen = $state(false)
  let newMemberUserId = $state('')
  let newMemberRole = $state('project_member')
  let memberCandidates = $state<{ user_id: string; username: string; email: string; org_role: string }[]>([])
  let memberSearch = $state('')
  let loadingCandidates = $state(false)
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
    budget: 0,
    visibility: 'team',
  })
  const editForm = $state({
    name: '',
    description: '',
    status: 'pending',
  })

  $effect(() => {
    if (!projectState.id || projectState.id !== project.id) {
      projectState = { ...project }
    }

    if (!editing) {
      editForm.name = projectState.name
      editForm.description = projectState.description ?? ''
      editForm.status = projectState.status ?? 'pending'
    }
  })

  $effect(() => {
    if (addMemberOpen && project.id) {
      void loadMemberCandidates()
    }
  })

  async function loadMemberCandidates() {
    loadingCandidates = true
    try {
      const params = new URLSearchParams()
      if (memberSearch.trim()) params.set('search', memberSearch.trim())
      const resp = await fetch(`/projects/${project.id}/member-candidates?${params}`)
      const result = await resp.json() as { data: [{ user_id: string; username: string; email: string; org_role: string }] }
      memberCandidates = result.data
    } catch {
      memberCandidates = []
    } finally {
      loadingCandidates = false
    }
  }

  function getMemberInitials(member: (typeof safeMembers)[number]): string {
    const fromUsername = member.username ? member.username.charAt(0).toUpperCase() : ''
    const fromEmail = member.email ? member.email.charAt(0).toUpperCase() : ''
    return fromUsername || fromEmail || '?'
  }

  async function handleDeleteProject() {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return

    deleting = true
    try {
      await axios.delete(`/api/projects/${project.id}`)
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
      await axios.put(`/api/projects/${project.id}`, {
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

  function handleAddMember(e: Event) {
    e.preventDefault()
    const userId = newMemberUserId.trim()
    if (!userId) return

    router.post(
      '/projects/members',
      {
        project_id: project.id,
        user_id: userId,
        project_role: newMemberRole,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          newMemberUserId = ''
          newMemberRole = 'project_member'
          addMemberOpen = false
        },
      }
    )
  }

  function handleUpdateMemberRole(userId: string, newRole: string) {
    router.put(
      `/projects/members/${userId}`,
      {
        project_id: project.id,
        project_role: newRole,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function handleRemoveMember(userId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?')) return

    router.delete(
      `/projects/members/${userId}`,
      {
        data: {
          project_id: project.id,
        },
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  // Skills & roles are now handled by ProjectSkillsTab and ProjectRolesTab components
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
          <Button variant="destructive" onclick={() => { void handleDeleteProject() }} disabled={deleting || saving}>
            Xóa
          </Button>
        {/if}

        <Button onclick={() => { router.visit(baseRoute) }} variant="outline">
          Quay lại
        </Button>
      </div>
    </div>

    <Tabs value="details">
      <TabsList>
        <TabsTrigger value="details">Chi tiết</TabsTrigger>
        <TabsTrigger value="members">Thành viên</TabsTrigger>
        <TabsTrigger value="tasks">Công việc</TabsTrigger>
        <TabsTrigger value="skills">Skills Catalog</TabsTrigger>
        <TabsTrigger value="roles">Professional Roles</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
        <Card>
          <CardContent class="pt-6">
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
      </TabsContent>

      <TabsContent value="members" class="mt-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Thành viên</CardTitle>
            {#if permissions.isCreator || permissions.isManager}
              <Button size="sm" onclick={() => { addMemberOpen = true }}>
                Thêm thành viên
              </Button>
              <Dialog open={addMemberOpen}>
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
                            <option value={candidate.user_id}>
                              {candidate.username} ({candidate.email}) — {candidate.org_role}
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
                    <Button type="submit" disabled={!newMemberUserId}>
                      Thêm
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            {/if}
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#if safeMembers.length === 0}
                <p class="col-span-full text-center py-4 text-muted-foreground">
                  Chưa có thành viên nào
                </p>
              {:else}
                {#each safeMembers as member, index (`${member.user_id ?? ''}-${index}`)}
                  <div class="flex items-center justify-between space-x-3 p-3 border rounded-md">
                    <div class="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p class="font-medium">{member.username || member.email}</p>
                        <p class="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if permissions.isCreator || permissions.isManager}
                        <select
                          value={member.role}
                          onchange={(event: Event) => {
                            const target = event.currentTarget as HTMLSelectElement
                            handleUpdateMemberRole(member.user_id ?? '', target.value)
                          }}
                          class="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="project_viewer">Viewer</option>
                          <option value="project_member">Member</option>
                          <option value="project_manager">Manager</option>
                        </select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onclick={() => { handleRemoveMember(member.user_id ?? ''); }}
                        >
                          Xóa
                        </Button>
                      {:else}
                        <span class="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                          {member.role}
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tasks" class="mt-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Công việc</CardTitle>
            <Button
              size="sm"
              onclick={() => {
                router.get(
                  shellMode === 'organization' ? '/org/tasks' : FRONTEND_ROUTES.TASKS,
                  { project_id: project.id }
                )
              }}
            >
              Xem tất cả công việc
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Hạn chót</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#if safeTasks.length === 0}
                  <TableRow>
                    <TableCell class="text-center py-4" colspan={5}>
                      Chưa có công việc nào
                    </TableCell>
                  </TableRow>
                {:else}
                  {#each safeTasks as task (task.id)}
                    <TableRow>
                      <TableCell class="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-06 text-foreground">
                          {task.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {task.priority ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell>{task.assignee_name ?? '-'}</TableCell>
                      <TableCell>{task.due_date ? formatDate(task.due_date) : '-'}</TableCell>
                    </TableRow>
                  {/each}
                {/if}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="skills" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Skills Catalog</CardTitle>
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
            <CardTitle>Professional Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectRolesTab
              projectId={project.id}
              canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</Layout>
