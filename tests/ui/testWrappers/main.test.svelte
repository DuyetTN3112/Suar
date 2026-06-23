<script lang="ts">
  import Main from '../../../inertia/components/layout/main.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<Main class={cls}>{text}</Main>