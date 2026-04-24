<script lang="ts">
  import ControlSidebar from '@/components/layout/control_sidebar.svelte'
  import { organizationNavigation } from '@/components/navigation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()
</script>

<ControlSidebar
  {open}
  {onClose}
  navigation={organizationNavigation}
  brandTitle="SUAR ORG"
  brandSubtitle="Organization workspace"
  ticketTitle="Org mode"
  ticketText="Manage team workflow signals"
  workspaceLabel="Organization workspace"
  logo="S"
/>
