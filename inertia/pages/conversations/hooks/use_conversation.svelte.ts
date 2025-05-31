import { writable, derived, get } from 'svelte/store'
import axios from 'axios'
import type { Conversation, Message } from '../types'

export function createConversationStore() {
  const selectedId = writable<string | null>(null)
  const selectedConversation = writable<Conversation | null>(null)
  const messages = writable<Message[]>([])
  const isLoading = writable(false)
  const hasMore = writable(false)
  const currentPage = writable(1)
  const newMessage = writable('')
  const currentMessage = writable<Message | null>(null)
  const recallDialogOpen = writable(false)

  // Lấy CSRF token từ meta tag
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Tải cuộc trò chuyện
  const loadConversation = async (conversationId: string) => {
    isLoading.set(true)
    try {
      const response = await axios.get(`/api/conversations/${conversationId}`, {
        params: { page: 1, limit: 50 },
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      selectedConversation.set(response.data.conversation)

      // Kiểm tra dữ liệu tin nhắn
      if (response.data.messages) {
        let messagesData = []
        if (Array.isArray(response.data.messages)) {
          messagesData = [...response.data.messages].filter((message) => {
            const timeField = message.created_at || message.timestamp
            if (!timeField) return false
            const time = new Date(timeField)
            return !Number.isNaN(time.getTime())
          })
        } else if (response.data.messages.data && Array.isArray(response.data.messages.data)) {
          messagesData = [...response.data.messages.data].filter((message) => {
            const timeField = message.created_at || message.timestamp
            if (!timeField) return false
            const time = new Date(timeField)
            return !Number.isNaN(time.getTime())
          })
        }
        messages.set(messagesData)

        if (response.data.pagination) {
          hasMore.set(response.data.pagination.hasMore || false)
        } else {
          hasMore.set(false)
        }
      } else {
        messages.set([])
        hasMore.set(false)
      }
      currentPage.set(1)

      // Đánh dấu tin nhắn đã đọc
      axios
        .post(
          `/api/conversations/${conversationId}/mark-as-read`,
          {},
          {
            headers: {
              'X-CSRF-TOKEN': getCsrfToken(),
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          }
        )
        .catch(() => {
          // Silently ignore marking as read errors
        })
    } catch (error) {
      console.error('Không thể tải cuộc trò chuyện:', error)
      if (axios.isAxiosError(error)) {
        console.error('Chi tiết lỗi API:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })
      }
      messages.set([])
      hasMore.set(false)
    } finally {
      isLoading.set(false)
    }
  }

  // Tải thêm tin nhắn
  const loadMoreMessages = async () => {
    const id = get(selectedId)
    const more = get(hasMore)
    if (!id || !more) return

    isLoading.set(true)
    try {
      const page = get(currentPage)
      const response = await axios.get(`/api/conversations/${id}`, {
        params: { page: page + 1, limit: 50 },
      })

      const currentMessages = get(messages)
      messages.set([...response.data.messages.data, ...currentMessages])
      hasMore.set(response.data.pagination.hasMore)
      currentPage.update((p) => p + 1)
    } catch (error) {
      console.error('Không thể tải thêm tin nhắn:', error)
    } finally {
      isLoading.set(false)
    }
  }

  // Gửi tin nhắn mới
  const sendMessage = async () => {
    const msg = get(newMessage)
    const id = get(selectedId)
    if (!msg.trim() || !id) return

    isLoading.set(true)
    try {
      await axios.post(
        `/api/conversations/${id}/messages`,
        {
          message: msg,
          _token: getCsrfToken(),
        },
        {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      newMessage.set('')

      await new Promise((resolve) => setTimeout(resolve, 300))
      await loadConversation(id)
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error)
    } finally {
      isLoading.set(false)
    }
  }

  // Xử lý thu hồi tin nhắn
  const handleRecallMessage = (message: Message) => {
    currentMessage.set(message)
    recallDialogOpen.set(true)
  }

  // Thu hồi tin nhắn với mọi người
  const handleRecallForEveryone = async () => {
    const msg = get(currentMessage)
    const id = get(selectedId)
    if (!msg || !id) return

    try {
      await axios.post(
        `/api/conversations/${id}/messages/${msg.id}/recall`,
        {
          scope: 'all',
          _token: getCsrfToken(),
        },
        {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )

      messages.update((prevMessages) =>
        prevMessages.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                is_recalled: true,
                recall_scope: 'all',
                recalled_at: new Date().toISOString(),
              }
            : m
        )
      )

      await loadConversation(id)
      recallDialogOpen.set(false)
      currentMessage.set(null)
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn:', error)
      if (axios.isAxiosError(error)) {
        console.error('Chi tiết lỗi API thu hồi:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })
      }
    }
  }

  // Thu hồi tin nhắn chỉ cho bản thân
  const handleRecallForSelf = async () => {
    const msg = get(currentMessage)
    const id = get(selectedId)
    if (!msg || !id) return

    try {
      await axios.post(
        `/api/conversations/${id}/messages/${msg.id}/recall`,
        {
          scope: 'self',
          _token: getCsrfToken(),
        },
        {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )

      messages.update((prevMessages) =>
        prevMessages.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                is_recalled: true,
                recall_scope: 'self',
                recalled_at: new Date().toISOString(),
              }
            : m
        )
      )

      await loadConversation(id)
      recallDialogOpen.set(false)
      currentMessage.set(null)
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn cho bản thân:', error)
      if (axios.isAxiosError(error)) {
        console.error('Chi tiết lỗi API thu hồi cho bản thân:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })
      }
    }
  }

  return {
    selectedId,
    selectedConversation,
    messages,
    isLoading,
    hasMore,
    newMessage,
    currentMessage,
    recallDialogOpen,
    loadConversation,
    loadMoreMessages,
    sendMessage,
    handleRecallMessage,
    handleRecallForEveryone,
    handleRecallForSelf,
  }
}
