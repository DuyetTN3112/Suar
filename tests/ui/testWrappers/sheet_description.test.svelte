<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetDescription from '../../../inertia/components/ui/sheet_description.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetDescription', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetDescription class={cls}>{text}</SheetDescription></Sheet>