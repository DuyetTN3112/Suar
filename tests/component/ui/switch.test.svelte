<script lang="ts">
  import Switch from '@/components/ui/switch.svelte'
  let { checked = $bindable(false), disabled, id, ...restProps } = $props<{
    checked?: boolean
    disabled?: boolean
    id?: string
  }>()
</script>

<Switch bind:checked {disabled} {id} {...restProps} />
