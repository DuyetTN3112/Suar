<script lang="ts">
  import Textarea from '../../../inertia/components/ui/textarea.svelte'
  interface Props {
    value?: string
    placeholder?: string
    disabled?: boolean
    class?: string
    [key: string]: any
  }
  let { value = '', placeholder = '', disabled = false, class: className = '', ...rest }: Props = $props()
</script>
<Textarea {value} {placeholder} {disabled} class={className} {...rest}></Textarea>