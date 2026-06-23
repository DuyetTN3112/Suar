<script lang="ts">
  import Search from '../../../inertia/components/search.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<Search class={cls}>{text}</Search>