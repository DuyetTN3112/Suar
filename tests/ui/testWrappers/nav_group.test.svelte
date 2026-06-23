<script lang="ts">
  import NavGroup from '../../../inertia/components/layout/nav_group.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<div class={cls}>
  <NavGroup title={text} items={[]} />
</div>