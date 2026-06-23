<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetFooter from '../../../inertia/components/ui/sheet_footer.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetFooter', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetFooter class={cls}>{text}</SheetFooter></Sheet>