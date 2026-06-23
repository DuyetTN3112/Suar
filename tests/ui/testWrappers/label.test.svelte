<script lang="ts">
  import Label from '../../../inertia/components/ui/label.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Label class={cls}>{text}</Label>