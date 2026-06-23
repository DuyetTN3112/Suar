<script lang="ts">
  import OrganizationSidebar from '../../../inertia/components/layout/organization_sidebar.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <OrganizationSidebar {open}>{text}</OrganizationSidebar>
</div>