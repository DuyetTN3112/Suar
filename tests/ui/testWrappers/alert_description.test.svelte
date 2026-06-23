<script lang="ts">
  import AlertDescription from '../../../inertia/components/ui/alert_description.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<AlertDescription class={cls}>{text}</AlertDescription>