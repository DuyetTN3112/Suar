<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/org/shared/components/layout/control_sidebar.svelte'
  import { getOrganizationNavigationForRole } from '@/apps/org/shared/components/navigation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()

  const currentOrgRole = $derived(
    (page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props
      .auth?.user?.current_organization_role ?? null
  )
  const currentProject = $derived(
    (
      page as {
        props: {
          auth?: {
            user?: {
              current_project?: { id?: string | null; name?: string | null } | null
            }
          }
        }
      }
    ).props.auth?.user?.current_project ?? null
  )

  const navigation = $derived.by(() =>
    getOrganizationNavigationForRole(
      currentOrgRole,
      currentProject?.id ? { id: currentProject.id, name: currentProject.name ?? null } : null
    )
  )
</script>

<ControlSidebar
  {open}
  {onClose}
  {navigation}
  brandTitle="SUAR ORG"
  brandSubtitle="Organization workspace"
  ticketTitle="Org workspace"
  ticketText="Coordinate org, project, sprint, task"
  workspaceLabel="Organization workspace"
  logo="S"
/>
