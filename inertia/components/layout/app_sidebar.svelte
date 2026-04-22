<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import ControlSidebar from '@/components/layout/control_sidebar.svelte'
  import { mainNavigation } from '@/components/navigation.svelte'

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
    const canRecruit = currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin'

    return mainNavigation.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!('url' in item)) return true
        if (item.url === '/marketplace/talents' || item.url === '/marketplace/bookmarks') {
          return canRecruit
        }
        return true
      }),
    }))
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
