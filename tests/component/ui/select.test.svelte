<script lang="ts">
  import Select from '@/components/ui/select.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  let { value = $bindable(''), disabled, ...restProps } = $props<{
    value?: string
    disabled?: boolean
  }>()
</script>

<Select bind:value {disabled} {...restProps}>
  <SelectTrigger>
    <SelectValue placeholder="Pick one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Alpha</SelectItem>
    <SelectItem value="b">Beta</SelectItem>
  </SelectContent>
</Select>
