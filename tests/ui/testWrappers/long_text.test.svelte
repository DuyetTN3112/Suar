<script lang="ts">
  import LongText from '../../../inertia/components/long_text.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<LongText class={cls}>{text}</LongText>