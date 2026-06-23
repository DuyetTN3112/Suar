<script lang="ts">
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/org/shared/ui/select_value.svelte'

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
