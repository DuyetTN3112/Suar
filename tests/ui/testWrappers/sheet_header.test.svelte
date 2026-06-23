<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetHeader from '../../../inertia/components/ui/sheet_header.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetHeader', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetHeader class={cls}>{text}</SheetHeader></Sheet>