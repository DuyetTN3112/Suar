<script lang="ts">
  import { setContext } from 'svelte'
  import NavUser from '../../../inertia/components/layout/nav_user.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
  const defaultUser = { name: 'Duyet TN', email: 'duyet@suar.local' }

  setContext('sidebar', {
    state: 'expanded',
    isMobile: false,
    toggleSidebar: () => {},
    setOpenMobile: () => {}
  })
</script>
<div class={cls}>
  <NavUser user={defaultUser} />
</div>