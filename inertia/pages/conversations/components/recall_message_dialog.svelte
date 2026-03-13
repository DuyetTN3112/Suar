<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { Loader2 } from 'lucide-svelte'

  interface Props {
    open: boolean
    onClose: () => void
    onRecallForEveryone: () => Promise<void>
    onRecallForSelf: () => Promise<void>
  }

  const { open, onClose, onRecallForEveryone, onRecallForSelf }: Props = $props()

  let recallType = $state<'everyone' | 'self'>('everyone')
  let isRecalling = $state(false)

  async function handleRecall() {
    isRecalling = true
    try {
      if (recallType === 'everyone') {
        await onRecallForEveryone()
      } else {
        await onRecallForSelf()
      }
      notificationStore.success('Thu hồi tin nhắn thành công',
        recallType === 'everyone'
          ? 'Tin nhắn đã được thu hồi với tất cả người dùng'
          : 'Tin nhắn đã được thu hồi chỉ với bạn'
      )
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn:', error)
      notificationStore.error('Lỗi thu hồi tin nhắn',
        'Không thể thu hồi tin nhắn. Vui lòng thử lại.'
      )
    } finally {
      isRecalling = false
    }
  }
</script>

<Dialog {open} onOpenChange={onClose}>
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Thu hồi tin nhắn</DialogTitle>
      <DialogDescription>
        Bạn muốn thu hồi tin nhắn này ở phía ai?
      </DialogDescription>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="space-y-2">
        <div class="flex items-center space-x-2">
          <input
            type="radio"
            id="everyone"
            name="recallType"
            class="w-4 h-4"
            checked={recallType === 'everyone'}
            onchange={() => recallType = 'everyone'}
          />
          <label for="everyone" class="text-sm font-medium">
            Thu hồi với mọi người
          </label>
        </div>
        <div class="pl-6 text-sm text-muted-foreground">
          Tin nhắn này sẽ bị thu hồi với mọi người trong đoạn chat.
        </div>

        <div class="flex items-center space-x-2 mt-3">
          <input
            type="radio"
            id="self"
            name="recallType"
            class="w-4 h-4"
            checked={recallType === 'self'}
            onchange={() => recallType = 'self'}
          />
          <label for="self" class="text-sm font-medium">
            Thu hồi với bạn
          </label>
        </div>
        <div class="pl-6 text-sm text-muted-foreground">
          Tin nhắn này sẽ bị gỡ khỏi thiết bị của bạn, nhưng vẫn hiển thị với các thành viên khác trong đoạn chat.
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={onClose} disabled={isRecalling}>
        Hủy
      </Button>
      <Button onclick={handleRecall} disabled={isRecalling}>
        {#if isRecalling}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Thu hồi
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
