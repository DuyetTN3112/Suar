<script lang="ts">
  import Checkbox from '../../../inertia/components/ui/checkbox.svelte'
  interface Props {
    checked?: boolean
    class?: string
    [key: string]: any
  }
  let { checked = false, class: className = '', ...rest }: Props = $props()
</script>
<Checkbox {checked} class={className} {...rest}></Checkbox>