<script lang="ts">
  import Separator from '../../../inertia/components/ui/separator.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Separator class={cls}>{text}</Separator>