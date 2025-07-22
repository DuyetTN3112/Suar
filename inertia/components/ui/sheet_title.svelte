<script lang="ts">
  import { Dialog as SheetPrimitive, type DialogTitleProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  type Props = DialogTitleProps

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { class: _className, children: _children, ...rest } = props
    return rest
  })
</script>

<SheetPrimitive.Title
  class={cn('text-foreground font-semibold', className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Title>
