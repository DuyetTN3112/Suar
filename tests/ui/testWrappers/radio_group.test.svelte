<script lang="ts">
  import RadioGroup from '../../../inertia/components/ui/radio_group.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'RadioGroup', class: cls, value = 'opt1' }: Props = $props()
</script>
<RadioGroup class={cls}>{text}</RadioGroup>