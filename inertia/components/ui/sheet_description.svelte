<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Dialog as SheetPrimitive, type DialogDescriptionProps } from 'bits-ui'

  type Props = DialogDescriptionProps

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { class: _className, children: _children, ...rest } = props
    return rest
  })
</script>

<SheetPrimitive.Description
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Description>
