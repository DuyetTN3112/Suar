<script lang="ts">
  import NotificationDialog from '../../../inertia/components/notification_dialog.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <NotificationDialog>{text}</NotificationDialog>
</div>