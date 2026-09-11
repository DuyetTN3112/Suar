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
        projects?: ProjectLike[] | null
      } | null
    }
  }

  const { open = false, onClose }: Props = $props()
  const { t } = $derived(useTranslation())
  const pageData = $derived(page.props as unknown as ProjectPageProps)

  const project = $derived.by<ProjectLike | null>(() => {
    const selectedProject = pageData.projectContext?.selectedProject
    if (selectedProject?.id && selectedProject?.name) return selectedProject
    if (pageData.project?.id && pageData.project?.name) return pageData.project

    const targetProjectId =
      selectedProject?.id ??
      pageData.project?.id ??
      pageData.reviewWindow?.projectId ??
      pageData.projectId ??
      pageData.auth?.user?.current_project?.id ??
      null

    if (!targetProjectId) return null

    const targetProjectName =
      selectedProject?.name ??
      pageData.project?.name ??
      pageData.reviewWindow?.projectName ??
      null

    if (targetProjectName) {
      return { id: targetProjectId, name: targetProjectName }
    }

    const userProjects = pageData.auth?.user?.projects ?? []
    const matchedProject = userProjects.find((p) => p.id === targetProjectId)
    if (matchedProject?.name) {
      return { id: targetProjectId, name: matchedProject.name }
    }

    if (pageData.auth?.user?.current_project?.id === targetProjectId) {
      return {
        id: targetProjectId,
        name: pageData.auth?.user?.current_project?.name ?? null,
      }
    }

    return { id: targetProjectId, name: null }
  })

  const navigation = $derived.by(() =>
    project?.id
      ? buildProjectNavigationSections(
          { id: project.id, name: project.name ?? null }
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
