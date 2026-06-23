<script lang="ts">
  import { setContext } from 'svelte'
  import Header from '../../../inertia/components/layout/header.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()

  setContext('sidebar', {
    state: 'expanded',
    isMobile: false,
    toggleSidebar: () => {},
    setOpenMobile: () => {}
  })
</script>
<div class={cls}>
  <Header {open}>{text}</Header>
</div>