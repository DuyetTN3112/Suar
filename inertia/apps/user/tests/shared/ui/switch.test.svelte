<script lang="ts">
  import Switch from '@/apps/user/shared/ui/switch.svelte'
  let { checked = $bindable(false), disabled, id, ...restProps } = $props<{
    checked?: boolean
    disabled?: boolean
    id?: string
  }>()
</script>

<Switch bind:checked {disabled} {id} {...restProps} />
