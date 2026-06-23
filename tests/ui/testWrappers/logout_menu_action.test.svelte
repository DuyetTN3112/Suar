<script lang="ts">
  import LogoutMenuAction from '../../../inertia/components/layout/logout_menu_action.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<LogoutMenuAction class={cls}>{text}</LogoutMenuAction>