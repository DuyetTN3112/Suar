<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/user/shared/components/layout/control_sidebar.svelte'
  import { buildProjectNavigationSections } from '@/apps/user/shared/components/navigation/project_sections'
  import { mapNavGroup } from '@/apps/user/shared/components/navigation_helpers'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  interface ProjectLike {
    id?: string | null
    name?: string | null
  }

  interface ProjectPageProps {
    project?: ProjectLike | null
    projectId?: string | null
    projectContext?: {
      selectedProject?: ProjectLike | null
    } | null
    reviewWindow?: {
      projectId?: string | null
      projectName?: string | null
    } | null
    workspaceAccess?: {
      organization?: {
        canEnterManagement?: boolean
      } | null
    } | null
    auth?: {
      user?: {
        current_project?: ProjectLike | null
      } | null
    }
  }

  const { open = false, onClose }: Props = $props()
  const { t } = $derived(useTranslation())
  const pageData = $derived(page.props as unknown as ProjectPageProps)

  const canManageOrganization = $derived(
    pageData.workspaceAccess?.organization?.canEnterManagement ?? false
  )
  const project = $derived.by<ProjectLike | null>(() => {
    const selectedProject = pageData.projectContext?.selectedProject
    if (selectedProject?.id) return selectedProject
    if (pageData.project?.id) return pageData.project
    if (pageData.reviewWindow?.projectId) {
      return {
        id: pageData.reviewWindow.projectId,
        name: pageData.reviewWindow.projectName ?? null,
      }
    }
    if (pageData.projectId) {
      const currentProject = pageData.auth?.user?.current_project
      return {
        id: pageData.projectId,
        name: currentProject?.id === pageData.projectId ? currentProject.name : null,
      }
    }
    return pageData.auth?.user?.current_project ?? null
  })

  const navigation = $derived.by(() =>
    project?.id
      ? buildProjectNavigationSections(
          { id: project.id, name: project.name ?? null },
          canManageOrganization
        ).map((group) => mapNavGroup(group))
      : []
  )
</script>

<ControlSidebar
  {open}
  {onClose}
  {navigation}
  brandTitle="SUAR PROJECT"
  brandSubtitle={t('common.sidebar.project_workspace', {}, 'Project workspace')}
  ticketTitle={t('common.sidebar.shared_workspace', {}, 'Shared workspace')}
  ticketText={project?.name ?? t('common.select_project', {}, 'Select a project')}
  workspaceLabel={t('common.sidebar.project_workspace', {}, 'Project workspace')}
  logo="P"
  showProjectSwitcher={true}
  workspaceMode="project"
/>
