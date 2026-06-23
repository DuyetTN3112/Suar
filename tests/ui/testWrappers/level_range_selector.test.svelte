<script lang="ts">
  import LevelRangeSelector from '../../../inertia/components/ui/level_range_selector.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
  const mockLevels = [
    { id: '1', name: 'Level 1', ordinal: 1 },
    { id: '2', name: 'Level 2', ordinal: 2 },
    { id: '3', name: 'Level 3', ordinal: 3 }
  ]
</script>
<div class={cls}>
  <LevelRangeSelector
    levels={mockLevels}
    minLevelId="1"
    targetLevelId="2"
    ceilingLevelId="3"
  />
</div>