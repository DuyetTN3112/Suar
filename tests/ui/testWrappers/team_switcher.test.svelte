<script lang="ts">
  import TeamSwitcher from '../../../inertia/components/layout/team_switcher.svelte'
  interface Props { class?: string; text?: string; open?: boolean }
  let { class: cls, text = 'Test', open = false }: Props = $props()
</script>
<TeamSwitcher class={cls}>{text}</TeamSwitcher>