<script lang="ts">
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Sheet', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Sheet>{text}</Sheet>
</div>