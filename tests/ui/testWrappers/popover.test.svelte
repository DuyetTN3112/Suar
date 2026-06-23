<script lang="ts">
  import Popover from '../../../inertia/components/ui/popover.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Popover', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Popover>{text}</Popover>
</div>