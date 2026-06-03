<script lang="ts">
  import Checkbox from '@/components/ui/checkbox.svelte'
  let { checked = $bindable(false), disabled, id, ...restProps } = $props<{
    checked?: boolean
    disabled?: boolean
    id?: string
  }>()
</script>

<Checkbox bind:checked {disabled} {id} {...restProps} />
