<script lang="ts">
  import Popover from '../../../inertia/components/ui/popover.svelte'
  import PopoverContent from '../../../inertia/components/ui/popover_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'PopoverContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Popover open={true}>
    <PopoverContent>{text}</PopoverContent>
  </Popover>
</div>