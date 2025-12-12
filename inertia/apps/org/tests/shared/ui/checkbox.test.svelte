<script lang="ts">
  import Checkbox from '@/apps/org/shared/ui/checkbox.svelte'
  let { checked = $bindable(false), disabled, id, ...restProps } = $props<{
    checked?: boolean
    disabled?: boolean
    id?: string
  }>()
</script>

<Checkbox bind:checked {disabled} {id} {...restProps} />
