<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Select', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Select>{text}</Select>
</div>