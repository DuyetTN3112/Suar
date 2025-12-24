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

            Xóa
          </Button>
        {/if}

        <Button onclick={() => { router.get('/projects'); }} variant="outline">
          Quay lại
        </Button>
      </div>
    </div>

    <Tabs value="details">
      <TabsList>
        <TabsTrigger value="details">Chi tiết</TabsTrigger>
        <TabsTrigger value="members">Thành viên</TabsTrigger>
        <TabsTrigger value="tasks">Công việc</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
        <Card>
          <CardContent class="pt-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Mô tả</h3>
                <p>{project.description ?? 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Trạng thái</h3>
                <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {project.status ?? 'Không có'}
                </div>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Ngày bắt đầu</h3>
                <p>{project.start_date ? formatDate(project.start_date) : 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Ngày kết thúc</h3>
                <p>{project.end_date ? formatDate(project.end_date) : 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Người tạo</h3>
                <p>{project.creator_name ?? 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Quản lý</h3>
                <p>{project.manager_name ?? 'Không có'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" class="mt-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Thành viên</CardTitle>
            {#if permissions.isCreator || permissions.isManager}
              <Dialog bind:open={addMemberOpen}>
                <Button size="sm" onclick={() => { addMemberOpen = true }}>
                  Thêm thành viên
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm thành viên</DialogTitle>
                  </DialogHeader>
                  <form onsubmit={handleAddMember} class="space-y-4">
                    <div class="space-y-2">
                      <Label for="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        bind:value={newMemberEmail}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <Button type="submit">Thêm</Button>
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
                {#each safeMembers as member, index (`${member.user_id ?? member.email}-${index}`)}
                  <div class="flex items-center space-x-3 p-3 border rounded-md">
                    <Avatar>
                      <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p class="font-medium">{member.username || member.email}</p>
                      <p class="text-sm text-muted-foreground">{member.email}</p>
                      <p class="text-xs text-muted-foreground">{member.role}</p>
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
              <Button size="sm" onclick={() => { router.get(FRONTEND_ROUTES.TASKS, { project_id: project.id }); }}>
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
                    <TableCell colspan={5} class="text-center py-4">
                      Chưa có công việc nào
                    </TableCell>
                  </TableRow>
                {:else}
                  {#each safeTasks as task (task.id)}
                    <TableRow>
                      <TableCell class="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
    </Tabs>
  </div>
</AppLayout>
