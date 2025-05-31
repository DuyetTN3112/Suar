<script lang="ts">
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import type { Message } from './types'
  import { getAvatarInitials, formatMessageDate, calculateMessageSize } from '../utils/message_utils'
  import { useTranslation } from '@/hooks/use_translation.svelte'
  import Button from '@/components/ui/button.svelte'

  interface Props {
    message: Message
    isOutgoing: boolean
    loggedInUserAvatar?: string
    loggedInUserName?: string
    showSenderInfo: boolean
  }

  const { message, isOutgoing, loggedInUserAvatar, loggedInUserName, showSenderInfo }: Props = $props()

  const MAX_PREVIEW_LENGTH = 200
  const MAX_EXPANDED_HEIGHT = 300 // px
  const MAX_ZALGO_PREVIEW_LENGTH = 100 // Hiển thị ngắn hơn đối với các tin nhắn có khả năng là Zalgo

  const { t } = useTranslation()
  let isExpanded = $state(false)

  // Kiểm tra xem tin nhắn có khả năng là Zalgo text không
  const isPotentialZalgo = $derived.by(() => {
    // Phát hiện các ký tự đặc biệt Unicode hoặc các mẫu lặp lại
    const hasCombiningChars = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F\u02EC\u20DD]{3,}/g.test(message.message)
    const hasRepeatingPattern = /([\u02EC\u20DD\u0300-\u036F])\1{10,}/g.test(message.message)

    // Các tin nhắn có quá nhiều Unicode đặc biệt
    const tooManySpecialChars = Array.from(message.message).filter(ch => ch.codePointAt(0)! > 0xffff).length > 10

    // Phát hiện ký tự Zalgo cụ thể (꙰)
    const hasZalgoChar = /꙰/.test(message.message)

    // Kiểm tra mật độ ký tự đặc biệt
    const checkSpecialCharDensity = () => {
      // Chia nhỏ tin nhắn thành các đoạn 50 ký tự
      const chunks = []
      for (let i = 0; i < message.message.length; i += 50) {
        chunks.push(message.message.substring(i, i + 50))
      }

      // Kiểm tra mật độ trong từng đoạn
      return chunks.some(chunk => {
        const specialChars = Array.from(chunk).filter(ch => {
          const code = ch.codePointAt(0)!
          return code > 0x7f
        })
        // Nếu mật độ ký tự đặc biệt > 20% thì coi là đáng ngờ
        return specialChars.length > chunk.length * 0.2
      })
    }

    // Phát hiện mẫu hình mờ nhạt có thể gây hại
    const suspiciousPatterns = /(.)\1{20,}|([^\x00-\x7F]){50,}/g.test(message.message)

    return hasCombiningChars ||
           hasRepeatingPattern ||
           tooManySpecialChars ||
           hasZalgoChar ||
           checkSpecialCharDensity() ||
           suspiciousPatterns
  })

  // Sử dụng độ dài nhỏ hơn cho tin nhắn Zalgo
  const previewLength = $derived(isPotentialZalgo ? MAX_ZALGO_PREVIEW_LENGTH : MAX_PREVIEW_LENGTH)

  const shouldShowExpand = $derived(message.message.length > previewLength)
  const displayMessage = $derived(
    isExpanded
      ? message.message
      : message.message.slice(0, previewLength) + (shouldShowExpand ? (isPotentialZalgo ? '... (Nội dung đã được cắt giảm)' : '...') : '')
  )
</script>

<div class={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
  {#if !isOutgoing}
    <div class="flex-shrink-0 mr-2">
      <Avatar class="h-8 w-8">
        <AvatarFallback>{message.sender?.username?.[0]?.toUpperCase() || message.sender?.email?.[0]?.toUpperCase() || 'UN'}</AvatarFallback>
      </Avatar>
    </div>
  {/if}

  <div class="flex flex-col max-w-[70%] min-w-0">
    {#if !isOutgoing && showSenderInfo}
      <span class="text-xs font-medium text-slate-600 mb-1 ml-1">
        {message.sender?.username || message.sender?.email || t('conversation.user', {}, 'Người dùng')}
      </span>
    {/if}

    <div class={`px-3 py-2 rounded-2xl ${
      isOutgoing
        ? 'bg-primary text-primary-foreground rounded-br-none'
        : 'bg-muted text-foreground rounded-bl-none'
    }`}>
      <div
        class={`break-words whitespace-pre-wrap ${isPotentialZalgo ? 'zalgo-message' : ''}`}
        style="max-width: 100%; width: 100%; max-height: {isExpanded ? `${MAX_EXPANDED_HEIGHT}px` : 'auto'}; overflow-y: {isExpanded ? 'auto' : 'hidden'}; overflow-x: hidden; text-overflow: ellipsis; position: relative; word-break: break-all; overflow-wrap: break-word; word-wrap: break-word; hyphens: auto; line-height: 1.5;"
      >
        {#if isPotentialZalgo}
          <!-- Hiển thị an toàn cho tin nhắn độc hại -->
          <div>
            <div class="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded mb-2 border-l-2 border-yellow-500">
              <p class="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Tin nhắn này có thể chứa nội dung độc hại
              </p>
            </div>

            {#if !isExpanded}
              <!-- Khi chưa mở rộng - hiển thị tóm tắt an toàn -->
              <div class="relative">
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent to-background/50 pointer-events-none"
                  style="z-index: 2;"
                ></div>
                <p
                  class="text-sm leading-relaxed m-0 user-content text-muted-foreground"
                  style="overflow: hidden; max-height: 40px; opacity: 0.7; filter: blur(0.3px);"
                >
                  {displayMessage.substring(0, 60)}
                  {displayMessage.length > 60 ? '...' : ''}
                </p>
                <div class="text-xs text-muted-foreground mt-1">
                  Nội dung đã bị giới hạn hiển thị vì lý do bảo mật
                </div>
              </div>
            {:else}
              <!-- Khi đã mở rộng - hiển thị trong container riêng biệt -->
              <div class="relative border border-amber-200 dark:border-amber-900 rounded p-2 bg-amber-50/50 dark:bg-amber-950/10">
                <p
                  class="text-sm leading-relaxed m-0 user-content"
                  style="overflow: auto; max-height: {MAX_EXPANDED_HEIGHT}px; opacity: 0.9; word-break: break-all; overflow-wrap: break-word; word-wrap: break-word; width: 100%;"
                >
                  {displayMessage}
                </p>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Hiển thị bình thường cho tin nhắn thông thường -->
          <p
            class="text-sm leading-relaxed m-0 user-content"
            style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: {isExpanded ? 'unset' : '5'}; overflow: hidden; word-break: break-all; overflow-wrap: break-word; word-wrap: break-word;"
          >
            {displayMessage}
          </p>
        {/if}
        {#if shouldShowExpand}
          <Button
            variant="link"
            class="text-xs p-0 h-auto mt-1"
            onclick={() => { isExpanded = !isExpanded; }}
          >
            {isExpanded
              ? t('conversation.show_less', {}, 'Thu gọn')
              : t('conversation.show_more', {}, 'Xem thêm')}
          </Button>
        {/if}
      </div>
      <div class={`text-xs mt-1 text-right ${
        isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
      }`}>
        {formatMessageDate(message.timestamp)}
        {#if isOutgoing}
          • {t('conversation.you', {}, 'Bạn')}
        {/if}
        <span class="ml-1">• {calculateMessageSize(message.message)}</span>
      </div>
    </div>
  </div>

  {#if isOutgoing}
    <div class="flex-shrink-0 ml-2">
      <Avatar class="h-8 w-8">
        <AvatarImage src={loggedInUserAvatar || ''} alt={loggedInUserName || t('conversation.you', {}, 'Bạn')} />
        <AvatarFallback>{getAvatarInitials(loggedInUserName || t('conversation.you', {}, 'Bạn'))}</AvatarFallback>
      </Avatar>
    </div>
  {/if}
</div>
