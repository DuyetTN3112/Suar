<script lang="ts">
  import { CircleCheck } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'

  interface Props {
    canDelete: boolean
    canMarkAsCompleted: boolean
    canEdit: boolean
    isEditing: boolean
    submitting: boolean
    onSoftDelete: () => void
    onMarkAsCompleted: () => void
    onSubmit: () => void
    onToggleEdit: () => void
    onClose: () => void
  }

  const {
    canDelete,
    canMarkAsCompleted,
    canEdit,
    isEditing,
    submitting,
    onSoftDelete,
    onMarkAsCompleted,
    onSubmit,
    onToggleEdit,
    onClose
  }: Props = $props()
</script>

<DialogFooter class="flex sm:justify-between flex-col sm:flex-row gap-3">
  {#if canDelete}
    <div class="flex gap-2">
      <Button variant="destructive" onclick={onSoftDelete}>
        Xóa
      </Button>
    </div>
  {/if}
  <div class="flex gap-2">
    {#if canMarkAsCompleted && !isEditing}
      <Button variant="secondary" onclick={onMarkAsCompleted}>
        <CircleCheck class="mr-2 h-4 w-4" />
        Đánh dấu hoàn thành
      </Button>
    {/if}
    {#if canEdit && isEditing}
      <Button onclick={onSubmit} disabled={submitting}>
        {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    {/if}
    {#if canEdit && !isEditing}
      <Button variant="secondary" onclick={onToggleEdit}>
        Sửa
      </Button>
    {/if}
    {#if isEditing}
      <Button variant="outline" onclick={onToggleEdit}>
        Hủy
      </Button>
    {:else}
      <Button variant="outline" onclick={onClose}>
        Đóng
      </Button>
    {/if}
  </div>
</DialogFooter>
