<script lang="ts">
  import ComingSoon from '../../../inertia/components/coming_soon.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <ComingSoon>{text}</ComingSoon>
</div>