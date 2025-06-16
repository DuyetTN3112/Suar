<script lang="ts">
  import { Popover as PopoverPrimitive, type PopoverTriggerProps } from 'bits-ui'

  type Props = PopoverTriggerProps & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<PopoverPrimitive.Trigger class={className} {...restProps} />
