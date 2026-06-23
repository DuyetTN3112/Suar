<script lang="ts">
  import SelectDropdown from '../../../inertia/components/select_dropdown.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<SelectDropdown class={cls}>{text}</SelectDropdown>