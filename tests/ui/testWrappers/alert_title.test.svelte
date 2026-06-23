<script lang="ts">
  import AlertTitle from '../../../inertia/components/ui/alert_title.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<AlertTitle class={cls}>{text}</AlertTitle>