<script lang="ts">
  import ProfileDropdown from '../../../inertia/components/profile_dropdown.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <ProfileDropdown>{text}</ProfileDropdown>
</div>