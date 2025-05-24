import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Conversation, Message } from '../types'

export const useConversation = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [newMessage, setNewMessage] = useState('')
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null)
  const [recallDialogOpen, setRecallDialogOpen] = useState(false)

  // Lấy CSRF token từ meta tag
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Tải cuộc trò chuyện
  const loadConversation = async (conversationId: string) => {
    setIsLoading(true)
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
      setSelectedConversation(response.data.conversation)
      // Kiểm tra dữ liệu tin nhắn
      if (response.data.messages) {
        // Kiểm tra cấu trúc dữ liệu - có thể là mảng trực tiếp hoặc là object với thuộc tính data
        let messagesData = []
        if (Array.isArray(response.data.messages)) {
          // Kiểm tra tính hợp lệ của mỗi tin nhắn
          messagesData = [...response.data.messages].filter((message) => {
            const timeField = message.created_at || message.timestamp
            // Loại bỏ tin nhắn không có thời gian
            if (!timeField) {
              return false
            }
            // Kiểm tra tính hợp lệ của thời gian
            const time = new Date(timeField)
            if (Number.isNaN(time.getTime())) {
              return false
            }
            return true
          })
        } else if (response.data.messages.data && Array.isArray(response.data.messages.data)) {
          // Kiểm tra tính hợp lệ của mỗi tin nhắn
          messagesData = [...response.data.messages.data].filter((message) => {
            const timeField = message.created_at || message.timestamp
            // Loại bỏ tin nhắn không có thời gian
            if (!timeField) {
              return false
            }
            // Kiểm tra tính hợp lệ của thời gian
            const time = new Date(timeField)
            if (Number.isNaN(time.getTime())) {
              return false
            }
            return true
          })
        }
        setMessages(messagesData)
        // Thông tin phân trang
        if (response.data.pagination) {
          setHasMore(response.data.pagination.hasMore || false)
        } else {
          setHasMore(false)
        }
      } else {
        setMessages([])
        setHasMore(false)
      }
      setCurrentPage(1)
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
        .then(() => {
        })
        .catch((err) => {
          console.warn('Lỗi khi đánh dấu đã đọc:', err)
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
      setMessages([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Tải thêm tin nhắn
  const loadMoreMessages = async () => {
    if (!selectedId || !hasMore) return
    setIsLoading(true)
    try {
      const response = await axios.get(`/api/conversations/${selectedId}`, {
        params: { page: currentPage + 1, limit: 50 },
      })
      // Thêm tin nhắn mới vào đầu danh sách hiện tại
      setMessages([...response.data.messages.data, ...messages])
      setHasMore(response.data.pagination.hasMore)
      setCurrentPage(currentPage + 1)
    } catch (error) {
      console.error('Không thể tải thêm tin nhắn:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Gửi tin nhắn mới
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedId) return
    setIsLoading(true)
    try {
      await axios.post(
        `/api/conversations/${selectedId}/messages`,
        {
          message: newMessage,
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
      setNewMessage('') // Xóa tin nhắn sau khi gửi thành công
      // Tải lại tin nhắn sau khi gửi
      await loadConversation(selectedId)
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error)
      // Xử lý lỗi ở đây
    } finally {
      setIsLoading(false)
    }
  }

  // Xử lý thu hồi tin nhắn
  const handleRecallMessage = (message: Message) => {
    setCurrentMessage(message)
    setRecallDialogOpen(true)
  }
  // Thu hồi tin nhắn với mọi người
  const handleRecallForEveryone = async () => {
    if (!currentMessage || !selectedId) return
    // Log chi tiết tin nhắn trước khi thu hồi
    const startTime = Date.now()

    try {
      // Gửi request thu hồi với scope là all (tất cả người dùng)
      const response = await axios.post(
        `/api/conversations/${selectedId}/messages/${currentMessage.id}/recall`,
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

      const endTime = Date.now()

      // Cập nhật trạng thái tin nhắn trong state local
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === currentMessage.id
            ? {
                ...msg,
                is_recalled: true,
                recall_scope: 'all',
                recalled_at: new Date().toISOString(),
              }
            : msg
        )
      )

      // Tải lại dữ liệu từ API để đảm bảo đồng bộ
      try {
        // Nếu response có chứa tin nhắn đã cập nhật, sử dụng dữ liệu đó
        if (response.data?.messages) {
          setMessages(response.data.messages)
        } else {
          // Nếu không, tải lại toàn bộ danh sách tin nhắn
          await loadConversation(selectedId)
        }
      } catch (reloadError) {
        // Nếu vẫn có vấn đề, thử tải lại sau 1 giây
        setTimeout(async () => {
          try {
            await loadConversation(selectedId)
          } catch (secondReloadError) {
          }
        }, 1000)
      }

      // Đóng dialog thu hồi
      setRecallDialogOpen(false)
      setCurrentMessage(null)
    } catch (error) {
      // Keep error logging for actual errors
      console.error('Lỗi khi thu hồi tin nhắn:', error)
      if (axios.isAxiosError(error)) {
        // Keep error logging for actual errors
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
    if (!currentMessage || !selectedId) return

    const startTime = Date.now()

    try {
      // Gửi request thu hồi với scope là self (chỉ người dùng hiện tại)
      const response = await axios.post(
        `/api/conversations/${selectedId}/messages/${currentMessage.id}/recall`,
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

      const endTime = Date.now()

      // Cập nhật trạng thái tin nhắn trong state local
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === currentMessage.id
            ? {
                ...msg,
                is_recalled: true,
                recall_scope: 'self',
                recalled_at: new Date().toISOString(),
              }
            : msg
        )
      )

      // Tải lại dữ liệu từ API để đảm bảo đồng bộ
      await loadConversation(selectedId)

      // Kiểm tra xem tin nhắn có thực sự bị thu hồi không
      const recalledMessage = messages.find((msg) => msg.id === currentMessage.id)
      if (recalledMessage && !recalledMessage.is_recalled) {
      }

      // Đóng dialog thu hồi
      setRecallDialogOpen(false)
      setCurrentMessage(null)
    } catch (error) {
      // Keep error logging for actual errors
      console.error('Lỗi khi thu hồi tin nhắn cho bản thân:', error)
      if (axios.isAxiosError(error)) {
        // Keep error logging for actual errors
        console.error('Chi tiết lỗi API thu hồi cho bản thân:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })
      }
    }
  }

  // Kiểm tra URL để xem có conversation ID nào không
  useEffect(() => {
    const pathParts = window.location.pathname.split('/')
    if (pathParts.length > 2 && pathParts[1] === 'conversations') {
      const conversationId = pathParts[2]
      // Đảm bảo conversationId không phải là "create"
      if (conversationId && conversationId !== 'create') {
        setSelectedId(conversationId)
        loadConversation(conversationId)
        // Thay đổi URL mà không reload trang
        const newUrl = `/conversations`
        window.history.pushState({}, '', newUrl)
      }
    }
  }, [])

  // Tải cuộc trò chuyện khi selectedId thay đổi
  useEffect(() => {
    if (selectedId) {
      loadConversation(selectedId)
    }
  }, [selectedId])

  // Thêm hàm refreshMessages vào window để component MessageInput có thể gọi
  useEffect(() => {
    window.refreshMessages = () => {
      if (selectedId) {
        loadConversation(selectedId)
      }
    }
    // Dọn dẹp khi component unmount
    return () => {
      window.refreshMessages = undefined
    }
  }, [selectedId])

  return {
    selectedId,
    setSelectedId,
    selectedConversation,
    messages,
    isLoading,
    hasMore,
    newMessage,
    setNewMessage,
    recallDialogOpen,
    setRecallDialogOpen,
    loadConversation,
    loadMoreMessages,
    sendMessage,
    handleRecallMessage,
    handleRecallForEveryone,
    handleRecallForSelf,
  }
}
