<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import SheetTrigger from '../../../inertia/components/ui/sheet_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SheetTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Sheet><SheetTrigger class={cls}>{text}</SheetTrigger></Sheet>