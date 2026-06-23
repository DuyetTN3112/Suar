<script lang="ts">
  import Switch from '../../../inertia/components/ui/switch.svelte'
  interface Props {
    checked?: boolean
    disabled?: boolean
    class?: string
    [key: string]: any
  }
  let { checked = false, disabled = false, class: className = '', ...rest }: Props = $props()
</script>
<Switch {checked} {disabled} class={className} {...rest}></Switch>