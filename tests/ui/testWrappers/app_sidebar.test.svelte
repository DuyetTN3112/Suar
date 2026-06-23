<script lang="ts">
  import AppSidebar from '../../../inertia/components/layout/app_sidebar.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <AppSidebar {open}>{text}</AppSidebar>
</div>