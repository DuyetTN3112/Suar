<script lang="ts">
  import ControlSidebar from '@/components/layout/control_sidebar.svelte'
  import { adminNavigation } from '@/components/navigation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()
</script>

<ControlSidebar
  {open}
  {onClose}
  navigation={adminNavigation}
  brandTitle="SUAR ADMIN"
  brandSubtitle="System control workspace"
  ticketTitle="Admin mode"
  ticketText="Monitor IBSC quality signals"
  workspaceLabel="System workspace"
  logo="♜"
/>
