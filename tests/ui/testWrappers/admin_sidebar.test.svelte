<script lang="ts">
  import AdminSidebar from '../../../inertia/components/layout/admin_sidebar.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <AdminSidebar {open}>{text}</AdminSidebar>
</div>