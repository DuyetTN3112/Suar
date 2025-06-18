<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import { Building, ArrowRight } from 'lucide-svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import type { ProjectsIndexProps } from './types'
  import { formatDate } from '@/lib/utils'
  import { useTranslation } from '@/stores/translation.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import ProjectDetailModal from './components/project_detail_modal.svelte'

  const { t } = useTranslation()

  interface Props extends ProjectsIndexProps {
    showOrganizationRequiredModal?: boolean
  }

  const { projects, auth, showOrganizationRequiredModal = false }: Props = $props()
  const authUser = $derived(auth.user)

  // Guard against undefined
  const safeProjects = $derived(projects)
  const hasCurrentOrganization = $derived(Boolean(authUser.current_organization_id))
  const organizations = $derived(authUser.organizations ?? [])
  const selectedOrganizationId = $derived(authUser.current_organization_id ?? '')

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
    router.get('/projects/create')
  }

  function handleViewProject(id: string) {
    selectedProjectId = id
    detailModalOpen = true
  }

  function handleDeleteProject(id: string) {
    if (confirm(t('common.confirm_delete', {}, 'Bạn có chắc chắn muốn xóa?'))) {
      router.delete(`/projects/${id}`)
    }
  }

  function handleProjectDeleted() {
    detailModalOpen = false
    selectedProjectId = undefined
    // Refresh projects list
    router.visit('/projects', { replace: true })
  }

  function handleGoToOrganizations() {
    router.get('/organizations')
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
        document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

      const response = await fetch('/switch-organization', {
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
        notificationStore.error(payload.message || 'Không thể chuyển tổ chức')
        return
      }

      notificationStore.success(payload.message || 'Đã chuyển tổ chức')
      router.visit(payload.redirect || '/tasks', {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch {
      notificationStore.error('Không thể chuyển tổ chức')
    }
  }

  const pageTitle = $derived(t('project.project_list', {}, 'Quản lý dự án'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <div class="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:w-[320px]">
        <Select
          value={selectedOrganizationId}
          onValueChange={(value: string) => {
            if (value) {
              void handleSwitchOrganization(value)
            }
          }}
        >
          <SelectTrigger>
            <span>
              {organizations.find((org) => org.id === selectedOrganizationId)?.name || 'Chọn tổ chức'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {#each organizations as organization (organization.id)}
              <SelectItem value={organization.id} label={organization.name}>
                {organization.name}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <Button size="sm" onclick={handleCreateClick}>
        {t('project.add_project', {}, 'Tạo dự án mới')}
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('project.project_list', {}, 'Danh sách dự án')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('project.name', {}, 'Tên dự án')}</TableHead>
              <TableHead>{t('organization.organization', {}, 'Tổ chức')}</TableHead>
              <TableHead>{t('common.status', {}, 'Trạng thái')}</TableHead>
              <TableHead>{t('project.manager', {}, 'Quản lý')}</TableHead>
              <TableHead>{t('project.start_date', {}, 'Ngày bắt đầu')}</TableHead>
              <TableHead>{t('project.end_date', {}, 'Ngày kết thúc')}</TableHead>
              <TableHead class="text-right">{t('common.actions', {}, 'Thao tác')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#if safeProjects.length === 0}
              <TableRow>
                <TableCell colspan={7} class="text-center py-4">
                  {t('project.no_projects', {}, 'Chưa có dự án nào')}
                </TableCell>
              </TableRow>
            {:else}
              {#each safeProjects as project (project.id)}
                <TableRow>
                  <TableCell class="font-medium">{project.name}</TableCell>
                  <TableCell>{project.organization_name}</TableCell>
                  <TableCell>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {project.status}
                    </span>
                  </TableCell>
                  <TableCell>{project.manager_name || '-'}</TableCell>
                  <TableCell>{project.start_date ? formatDate(project.start_date) : '-'}</TableCell>
                  <TableCell>{project.end_date ? formatDate(project.end_date) : '-'}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onclick={() => { handleViewProject(project.id); }}>
                        {t('common.view', {}, 'Xem')}
                      </Button>
                      <Button variant="destructive" size="sm" onclick={() => { handleDeleteProject(project.id); }}>
                        {t('common.delete', {}, 'Xóa')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>

  <Dialog bind:open={showOrganizationModal}>
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
</AppLayout>
