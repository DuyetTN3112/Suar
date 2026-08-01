<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/apps/org/shared/components/layout/control_sidebar.svelte'
  import { getOrganizationNavigationForRole } from '@/apps/org/shared/components/navigation.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

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
  const navigation = $derived.by(() => getOrganizationNavigationForRole(currentOrgRole))
</script>

<ControlSidebar
  {open}
  {onClose}
  {navigation}
  brandTitle="SUAR ORG"
  brandSubtitle={t('common.sidebar.organization_workspace', {}, 'Organization workspace')}
  ticketTitle={t('common.sidebar.organization_mode', {}, 'Organization workspace')}
  ticketText={t(
    'common.sidebar.organization_mode_description',
    {},
    'Govern organization membership, permissions, settings, and project portfolio'
  )}
  workspaceLabel={t('common.sidebar.organization_workspace', {}, 'Organization workspace')}
  logo="S"
/>
