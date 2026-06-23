<script lang="ts">
  import RadioGroup from '../../../inertia/components/ui/radio_group.svelte'
  import RadioGroupItem from '../../../inertia/components/ui/radio_group_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'RadioGroupItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<RadioGroup><RadioGroupItem class={cls}>{text}</RadioGroupItem></RadioGroup>