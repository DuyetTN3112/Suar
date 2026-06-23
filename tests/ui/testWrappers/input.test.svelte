<script lang="ts">
  import Input from '../../../inertia/components/ui/input.svelte'
  interface Props {
    type?: string
    placeholder?: string
    disabled?: boolean
    value?: string
    name?: string
    required?: boolean
    readonly?: boolean
    class?: string
    [key: string]: any
  }
  let {
    type = 'text',
    placeholder = '',
    disabled = false,
    value = '',
    name = '',
    required = false,
    readonly = false,
    class: className = '',
    ...rest
  }: Props = $props()
</script>
<Input
  {type}
  {placeholder}
  {disabled}
  {value}
  {name}
  {required}
  {readonly}
  class={className}
  {...rest}
></Input>