<script lang="ts">
  import NotificationDropdown from '../../../inertia/components/layout/notification_dropdown.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<NotificationDropdown class={cls}>{text}</NotificationDropdown>