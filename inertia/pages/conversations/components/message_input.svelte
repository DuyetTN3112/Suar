<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Send, Loader2 } from 'lucide-svelte'
  import { useTranslation } from '@/hooks/use_translation.svelte'
  import { toast } from 'svelte-sonner'

  interface Props {
    conversationId?: string
    isLoading?: boolean
  }

  const { conversationId, isLoading = false }: Props = $props()

  // Hằng số cho giới hạn tin nhắn
  const MAX_MESSAGE_LENGTH = 5000
  const SPAM_THRESHOLD = 20 // Số tin nhắn tối đa trong khoảng thời gian
  const SPAM_TIME_WINDOW = 10000 // 10 giây tính bằng milliseconds

  let message = $state('')
  let sending = $state(false)
  let messageCount = $state(0)
  let lastMessageTime = $state(0)

  const { t } = useTranslation()

  // Kiểm tra spam
  function checkSpam() {
    const now = Date.now()
    if (now - lastMessageTime < SPAM_TIME_WINDOW) {
      if (messageCount >= SPAM_THRESHOLD) {
        toast.error(t('conversation.spam_detected', {}, 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một chút.'))
        return true
      }
      messageCount++
    } else {
      messageCount = 1
      lastMessageTime = now
    }
    return false
  }

  // Kiểm tra ký tự đặc biệt
  function hasSpecialCharacters(text: string) {
    // Kiểm tra các ký tự đặc biệt có thể gây ra vấn đề
    const specialChars = /[<>{}[\]\\^~|]/g
    return specialChars.test(text)
  }

  function handleMessageChange(e: Event) {
    const target = e.target as HTMLInputElement
    const newMessage = target.value

    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(t('conversation.message_too_long', {},
        `Tin nhắn quá dài. Vui lòng chia thành nhiều tin nhắn ngắn hơn (tối đa ${MAX_MESSAGE_LENGTH} ký tự)`))
      message = newMessage.slice(0, MAX_MESSAGE_LENGTH)
      return
    }

    // Kiểm tra ký tự đặc biệt
    if (hasSpecialCharacters(newMessage)) {
      toast.error(t('conversation.invalid_characters', {}, 'Tin nhắn chứa ký tự không hợp lệ'))
      return
    }

    message = newMessage
  }

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (message.trim()) {
      // Kiểm tra spam trước khi gửi
      if (checkSpam()) {
        return
      }

      sending = true
      // Reset form sau 1 giây để giả lập gửi tin nhắn
      setTimeout(() => {
        message = ''
        sending = false
        // Tải lại trang sau khi gửi
        window.location.reload()
      }, 1000)
    }
  }

  // Get CSRF token
  const csrfToken = $derived(
    typeof document !== 'undefined'
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      : ''
  )
</script>

<div class="p-4 border-t">
  <!-- Sử dụng form truyền thống với method POST và action trỏ tới endpoint -->
  <form
    method="POST"
    action={`/conversations/${conversationId}/messages`}
    target="hidden-frame"
    onsubmit={handleSubmit}
  >
    <!-- Thêm CSRF token field - quan trọng cho Laravel -->
    <input
      type="hidden"
      name="_token"
      value={csrfToken}
    />

    <!-- Field tin nhắn -->
    <input type="hidden" name="content" value={message} />
    <input type="hidden" name="message" value={message} />

    <div class="flex items-center gap-2">
      <Input
        name="message_display"
        placeholder={t('conversation.message_placeholder', {}, 'Nhập tin nhắn của bạn...')}
        class="flex-1"
        value={message}
        oninput={handleMessageChange}
        disabled={isLoading || sending}
        maxlength={MAX_MESSAGE_LENGTH}
      />
      <Button
        type="submit"
        disabled={!message.trim() || isLoading || sending}
        size="icon"
        class="h-10 w-10 rounded-full"
      >
        {#if sending}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <Send class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  </form>

  <!-- iframe ẩn để nhận phản hồi từ form submit mà không làm mới trang -->
  <iframe name="hidden-frame" title="hidden" style="display: none;"></iframe>
</div>
