<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetContent from '../../../inertia/components/ui/sheet_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Sheet open={true}><SheetContent>{text}</SheetContent></Sheet>
</div>