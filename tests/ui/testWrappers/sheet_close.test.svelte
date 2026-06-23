<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetClose from '../../../inertia/components/ui/sheet_close.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetClose', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetClose class={cls}>{text}</SheetClose></Sheet>