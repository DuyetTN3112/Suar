<script lang="ts">
  import ScrollArea from '../../../inertia/components/ui/scroll_area.svelte'
  interface Props {
    orientation?: 'vertical' | 'horizontal'
    class?: string
    [key: string]: any
  }
  let { orientation = 'vertical', class: className = '', ...rest }: Props = $props()
</script>
<ScrollArea {orientation} class={className} {...rest}></ScrollArea>