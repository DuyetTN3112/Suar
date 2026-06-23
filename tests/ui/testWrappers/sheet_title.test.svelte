<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetTitle from '../../../inertia/components/ui/sheet_title.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetTitle', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetTitle class={cls}>{text}</SheetTitle></Sheet>