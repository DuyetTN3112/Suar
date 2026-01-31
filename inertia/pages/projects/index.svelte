<script lang="ts">
  import { page } from '@inertiajs/svelte'
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
  import type { ProjectsIndexProps, Project } from './types'
  import { formatDate } from '@/lib/utils'
  import { useTranslation } from '@/stores/translation.svelte'

  const { t } = useTranslation()

  interface Props extends ProjectsIndexProps {
    showOrganizationRequiredModal?: boolean
  }

  const { projects, auth, showOrganizationRequiredModal = false }: Props = $props()

  // Guard against undefined
  const safeProjects = $derived(projects || [])
  const hasCurrentOrganization = $derived(
    auth?.user?.current_organization_id !== null &&
    auth?.user?.current_organization_id !== undefined
  )

  let showOrganizationModal = $state(false)

  // Check if modal should show on mount
  $effect(() => {
    if (showOrganizationRequiredModal && !hasCurrentOrganization) {
      showOrganizationModal = true
    }
  })

  function handleCreateClick() {
    if (!hasCurrentOrganization) {
      showOrganizationModal = true
      return
    }
    router.get('/projects/create')
  }

  function handleViewProject(id: number) {
    router.get(`/projects/${id}`)
  }

  function handleDeleteProject(id: number) {
    if (confirm(t('common.confirm_delete', {}, 'Bạn có chắc chắn muốn xóa?'))) {
      router.delete(`/projects/${id}`)
    }
  }

  function handleGoToOrganizations() {
    router.get('/organizations')
  }

  const pageTitle = $derived(t('project.project_list', {}, 'Quản lý dự án'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-xl font-semibold">{pageTitle}</h1>
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
</AppLayout>
