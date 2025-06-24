<script lang="ts">
  import Checkbox from '@/components/ui/checkbox.svelte'

  interface Props {
    isAllSelected: boolean
    onSelectAll: (checked: boolean | 'indeterminate') => void
  }

  const { isAllSelected, onSelectAll }: Props = $props()
</script>

<div class="flex items-center justify-between p-2 border-b">
  <div class="flex items-center space-x-2">
    <Checkbox
      checked={isAllSelected}
      onCheckedChange={onSelectAll}
      aria-label="Select all tasks"
    />
    <span class="text-sm font-medium">Tất cả nhiệm vụ</span>
  </div>
</div>
