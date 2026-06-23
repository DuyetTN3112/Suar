<script lang="ts">
  import SkipToMain from '../../../inertia/components/skip_to_main.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<SkipToMain class={cls}>{text}</SkipToMain>