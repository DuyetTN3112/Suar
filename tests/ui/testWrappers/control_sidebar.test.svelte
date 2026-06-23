<script lang="ts">
  import ControlSidebar from '../../../inertia/components/layout/control_sidebar.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <ControlSidebar {open} navigation={[]}>{text}</ControlSidebar>
</div>