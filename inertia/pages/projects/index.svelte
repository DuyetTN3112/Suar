<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Building, ArrowRight } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { formatDate } from '@/lib/utils'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ProjectDetailModal from './components/project_detail_modal.svelte'
  import type { Project, User } from './types'

  const { t } = useTranslation()

  interface Props {
    projects: Project[]
    auth: {
      user?: AuthProjectsUser | null
    }
    shellMode?: 'app' | 'organization'
    showOrganizationRequiredModal?: boolean
  }

  interface AuthOrganizationOption {
    id: string
    name: string
  }

  interface AuthProjectsUser extends User {
    current_organization_id: string | null
    current_organization_role: string | null
    isAdmin: boolean
    organizations: AuthOrganizationOption[]
  }

  const { projects, auth, showOrganizationRequiredModal = false }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const authUser = $derived((auth.user as AuthProjectsUser | undefined) ?? {
    id: '',
    username: '',
    email: '',
    current_organization_id: null,
    current_organization_role: null,
    isAdmin: false,
    organizations: [],
  })

  // Guard against undefined
  const safeProjects = $derived(projects)
  const hasCurrentOrganization = $derived(Boolean(authUser.current_organization_id))
  const organizations = $derived(authUser.organizations)
  const selectedOrganizationId = $derived(authUser.current_organization_id ?? '')
  const canCreateProjects = $derived(
    authUser.isAdmin ||
      authUser.current_organization_role === 'org_admin' ||
      authUser.current_organization_role === 'org_owner'
  )

  let showOrganizationModal = $state(false)

  // Check if modal should show on mount
  $effect(() => {
    if (showOrganizationRequiredModal && !hasCurrentOrganization) {
      showOrganizationModal = true
    }
  })

  // Project detail modal state
  let detailModalOpen = $state(false)
  let selectedProjectId = $state<string | undefined>(undefined)

  function handleCreateClick() {
    if (!hasCurrentOrganization) {
      showOrganizationModal = true
      return
    }
    if (!canCreateProjects) {
      notificationStore.error('Chỉ org admin hoặc org owner mới có thể tạo dự án')
      return
    }
    router.get('/projects/create')
  }

  function handleViewProject(id: string) {
    selectedProjectId = id
    detailModalOpen = true
  }

  function handleProjectDeleted() {
    detailModalOpen = false
    selectedProjectId = undefined
    // Refresh projects list
    router.visit(FRONTEND_ROUTES.PROJECTS, { replace: true })
  }

  function handleGoToOrganizations() {
    router.get(FRONTEND_ROUTES.ORGANIZATIONS)
  }

  interface SwitchOrganizationResponse {
    success?: boolean
    message?: string
    redirect?: string
  }

  async function handleSwitchOrganization(organizationId: string) {
    if (!organizationId || organizationId === selectedOrganizationId) return

    try {
      const csrfToken =
        document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

      const response = await fetch(FRONTEND_ROUTES.SWITCH_ORGANIZATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ organization_id: organizationId }),
      })

      const payload = (await response.json()) as SwitchOrganizationResponse
      if (!response.ok || !payload.success) {
        notificationStore.error(payload.message ?? 'Không thể chuyển tổ chức')
        return
      }

      notificationStore.success(payload.message ?? 'Đã chuyển tổ chức')
      router.visit(payload.redirect ?? FRONTEND_ROUTES.PROJECTS, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch {
      notificationStore.error('Không thể chuyển tổ chức')
    }
  }

  const pageTitle = $derived(t('project.project_list', {}, 'Quản lý dự án'))
  const currentOrganizationName = $derived(
    organizations.find((organization) => organization.id === selectedOrganizationId)?.name ?? 'Chưa chọn'
  )

  function statusLabel(status?: string): string {
    if (!status) return 'Không rõ'

    switch (status) {
      case 'active':
      case 'in_progress':
        return 'Đang chạy'
      case 'on_hold':
        return 'Tạm dừng'
      case 'archived':
        return 'Lưu trữ'
      default:
        return status
    }
  }

  function statusBadge(
    status?: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'pending' | 'warning' {
    if (!status) return 'outline'

    switch (status) {
      case 'active':
        return 'default'
      case 'in_progress':
        return 'pending'
      case 'on_hold':
        return 'warning'
      case 'archived':
        return 'secondary'
      default:
        return 'outline'
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="min-w-0">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs">
      <div class="flex flex-col gap-4 p-4 border border-border rounded-xl bg-white sm:flex-row sm:items-center">
        <div class="w-full sm:w-80">
          <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-foreground/80" for="project-organization-switch">
            Tổ chức hiện tại
          </label>
          <select
            id="project-organization-switch"
            class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={selectedOrganizationId}
            onchange={(event) => {
              const value = event.currentTarget.value
              if (value) {
                void handleSwitchOrganization(value)
              }
            }}
          >
            {#each organizations as organization (organization.id)}
              <option value={organization.id}>{organization.name}</option>
            {/each}
          </select>
        </div>

        {#if canCreateProjects}
          <Button class="w-full sm:w-auto" type="button" onclick={handleCreateClick}>
            {t('project.add_project', {}, 'Tạo dự án mới')}
          </Button>
        {/if}
      </div>

      <div class="mt-6 flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-border bg-secondary/40 p-5 sm:p-6">
        <div>
          <div class="font-mono text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">User / Projects</div>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Các dự án bạn đang đồng hành</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Theo dõi danh sách các dự án bạn đang đồng hành đóng góp. Xem nhanh vai trò, thông tin liên hệ của quản lý dự án (Project Manager), trạng thái hoạt động hiện tại và các mốc thời gian quan trọng.
          </p>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="border border-border rounded-lg p-4 bg-white">
          <span class="block text-sm text-foreground/80">Tổng dự án</span>
          <strong class="mt-2 block text-2xl">{safeProjects.length}</strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-white">
          <span class="block text-sm text-foreground/80">Đang chạy</span>
          <strong class="mt-2 block text-2xl">
            {safeProjects.filter((project) => project.status === 'active' || project.status === 'in_progress').length}
          </strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-white">
          <span class="block text-sm text-foreground/80">Quản lý</span>
          <strong class="mt-2 block text-2xl">{new Set(safeProjects.map((project) => project.manager_name).filter(Boolean)).size}</strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-white">
          <span class="block text-sm text-foreground/80">Tổ chức hiện hành</span>
          <strong class="mt-2 block text-2xl">{currentOrganizationName}</strong>
        </div>
      </div>

      <div class="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
        <div class="overflow-x-auto">
          <Table class="min-w-5xl">
            <TableHeader class="bg-secondary/60">
              <TableRow class="hover:bg-transparent">
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('project.name', {}, 'Tên dự án')}</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('organization.organization', {}, 'Tổ chức')}</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">Phạm vi</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('common.status', {}, 'Trạng thái')}</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('project.manager', {}, 'Quản lý')}</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('project.start_date', {}, 'Ngày bắt đầu')}</TableHead>
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('project.end_date', {}, 'Ngày kết thúc')}</TableHead>
                <TableHead class="text-right font-bold uppercase tracking-wider text-foreground/70">{t('common.actions', {}, 'Thao tác')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#if safeProjects.length === 0}
                <TableRow class="hover:bg-secondary/40">
                  <TableCell class="py-12 text-center text-muted-foreground" colspan={8}>
                    <div class="mx-auto max-w-md space-y-2">
                      <p class="font-semibold text-foreground">{t('project.no_projects', {}, 'Chưa có dự án nào')}</p>
                      <p class="text-sm">Chọn tổ chức hoặc tạo dự án mới để bắt đầu gom công việc theo ngữ cảnh.</p>
                    </div>
                  </TableCell>
                </TableRow>
              {:else}
                {#each safeProjects as project (project.id)}
                  <TableRow class="hover:bg-secondary/40">
                    <TableCell class="font-semibold text-foreground">{project.name}</TableCell>
                    <TableCell class="text-muted-foreground">{project.organization_name}</TableCell>
                    <TableCell class="text-muted-foreground">
                      {project.visibility === 'public' ? 'Công khai' : project.visibility === 'private' ? 'Riêng tư' : project.visibility ?? 'Không rõ'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(project.status)}>{statusLabel(project.status)}</Badge>
                    </TableCell>
                    <TableCell class="text-muted-foreground">{project.manager_name ?? '-'}</TableCell>
                    <TableCell class="text-muted-foreground">{project.start_date ? formatDate(project.start_date) : '-'}</TableCell>
                    <TableCell class="text-muted-foreground">{project.end_date ? formatDate(project.end_date) : '-'}</TableCell>
                    <TableCell>
                      <div class="flex justify-end gap-2">
                        <Button variant="outline" size="sm" type="button" onclick={() => { handleViewProject(project.id); }}>
                          {t('common.view', {}, 'Xem')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                {/each}
              {/if}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  </div>

  <Dialog open={showOrganizationModal}>
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Building class="h-5 w-5" />
          <span>{t('organization.required', {}, 'Yêu cầu tổ chức')}</span>
        </DialogTitle>
        <DialogDescription>
          {t('organization.required_message', {}, 'Để sử dụng tính năng quản lý dự án, bạn cần tham gia hoặc tạo một tổ chức.')}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <p class="text-sm text-muted-foreground mb-4">
          {t('organization.project_scope_message', {}, 'Dự án được quản lý trong phạm vi tổ chức. Vui lòng tham gia hoặc tạo một tổ chức để tiếp tục.')}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onclick={() => { showOrganizationModal = false }}>
          {t('common.cancel', {}, 'Hủy')}
        </Button>
        <Button onclick={handleGoToOrganizations}>
          {t('organization.go_to_organizations', {}, 'Đi đến trang tổ chức')}
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ProjectDetailModal
    bind:open={detailModalOpen}
    projectId={selectedProjectId}
    onOpenChange={(open: boolean) => {
      detailModalOpen = open
      if (!open) {
        selectedProjectId = undefined
      }
    }}
    onDeleted={handleProjectDeleted}
  />
</Layout>
