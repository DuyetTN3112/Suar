<script lang="ts">
  import NavBar from '../../../inertia/components/layout/nav_bar.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <NavBar {open}>{text}</NavBar>
</div>