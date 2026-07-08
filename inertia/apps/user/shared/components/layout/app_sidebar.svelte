<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/user/shared/components/layout/control_sidebar.svelte'
  import { getMainNavigationForRole } from '@/apps/user/shared/components/navigation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()

  const currentOrgRole = $derived(
    (page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props
      .auth?.user?.current_organization_role ?? null
  )

  const navigation = $derived.by(() => {
    return getMainNavigationForRole(currentOrgRole)
  })
</script>

<ControlSidebar
  {open}
  {onClose}
  {navigation}
  brandTitle="SUAR"
  brandSubtitle="Work platform"
  ticketTitle="User mode"
  ticketText="Track work, profile, reviews"
  workspaceLabel="User workspace"
  logo="S"
/>
