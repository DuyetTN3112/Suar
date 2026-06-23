<script lang="ts">
  import TopNav from '../../../inertia/components/layout/top_nav.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<TopNav class={cls}>{text}</TopNav>