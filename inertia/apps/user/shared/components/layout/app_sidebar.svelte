<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/user/shared/components/layout/control_sidebar.svelte'
  import { getMainNavigationForRole } from '@/apps/user/shared/components/navigation.svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Props {
    open?: boolean
    onClose?: () => void
  }

  const { open = false, onClose }: Props = $props()
  const { t } = $derived(useTranslation())

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
  brandSubtitle={t('common.sidebar.work_platform', {}, 'Work platform')}
  ticketTitle={t('common.sidebar.user_mode', {}, 'User mode')}
  ticketText={t(
    'common.sidebar.user_mode_description',
    {},
    'Track work, profile, and reviews'
  )}
  workspaceLabel={t('common.sidebar.user_workspace', {}, 'User workspace')}
  logo="S"
  showProjectSwitcher={true}
  workspaceMode="personal"
/>
