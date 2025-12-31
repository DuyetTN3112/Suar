<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  let { value = $bindable(''), type = 'text', placeholder, disabled, class: className, ...restProps } = $props<{
    value?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    class?: string
  }>()
</script>

<Input bind:value {type} {placeholder} {disabled} class={className} {...restProps} />
