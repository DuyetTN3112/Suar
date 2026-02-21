<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/admin/shared/components/layout/control_sidebar.svelte'
  import { getAdminNavigationForRole } from '@/apps/admin/shared/components/navigation.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import type { SharedData } from '@/apps/admin/shared/types/shared_data'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()
  const { t } = useTranslation()

  const pageProps = $derived(page.props as unknown as SharedData)
  const authUser = $derived(pageProps.auth?.user ?? null)
  const navigation = $derived.by(() =>
    getAdminNavigationForRole(authUser?.system_role ?? null, authUser?.system_permissions ?? null)
  )
</script>

<ControlSidebar
  {open}
  {onClose}
  {navigation}
  brandTitle="SUAR ADMIN"
  brandSubtitle={t('common.sidebar.system_control_workspace', {}, 'System control workspace')}
  ticketTitle={t('common.sidebar.system_realm', {}, 'System realm')}
  ticketText={t('common.sidebar.system_realm_description', {}, 'Isolated system administration')}
  workspaceLabel={t('common.sidebar.system_workspace', {}, 'System workspace')}
  logo="A"
/>
