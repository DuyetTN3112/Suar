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
    console.log(`===== ĐANG TẢI CUỘC TRÒ CHUYỆN ID=${conversationId} =====`)
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
      console.log('Đã nhận response từ API:', {
        conversationId: response.data.conversation?.id,
        conversationTitle: response.data.conversation?.title,
        participantsCount: response.data.conversation?.conversation_participants?.length,
        messagesCount: Array.isArray(response.data.messages)
          ? response.data.messages.length
          : response.data.messages?.data?.length || 0,
        hasMore: response.data.pagination?.hasMore,
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
              console.warn('Tin nhắn thiếu thông tin thời gian')
              return false
            }
            // Kiểm tra tính hợp lệ của thời gian
            const time = new Date(timeField)
            if (Number.isNaN(time.getTime())) {
              console.warn('Tin nhắn có thời gian không hợp lệ')
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
              console.warn('Tin nhắn thiếu thông tin thời gian')
              return false
            }
            // Kiểm tra tính hợp lệ của thời gian
            const time = new Date(timeField)
            if (Number.isNaN(time.getTime())) {
              console.warn('Tin nhắn có thời gian không hợp lệ')
              return false
            }
            return true
          })
        }
        // Log tổng quan về tin nhắn đã lọc
        console.log(
          `Đã lọc được ${messagesData.length} tin nhắn hợp lệ, kiểm tra tình trạng thu hồi:`,
          {
            totalMessages: messagesData.length,
            recalledMessages: messagesData.filter((msg) => msg.is_recalled === true).length,
            messageIdsWithRecallScope: messagesData
              .filter((msg) => msg.recall_scope)
              .map((msg) => ({ id: msg.id, scope: msg.recall_scope })),
          }
        )

        setMessages(messagesData)
        // Thông tin phân trang
        if (response.data.pagination) {
          setHasMore(response.data.pagination.hasMore || false)
        } else {
          setHasMore(false)
        }
      } else {
        console.warn('Không có dữ liệu tin nhắn trong response')
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
          console.log('Đã đánh dấu đã đọc tin nhắn trong cuộc trò chuyện')
        })
        .catch((err) => {
          console.warn('Lỗi khi đánh dấu đã đọc:', err)
        })
      console.log('Đã cập nhật state với tin nhắn mới')
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
    console.log('===== TRƯỚC KHI THU HỒI CHO MỌI NGƯỜI =====')
    console.log('Thông tin tin nhắn cần thu hồi:', {
      id: currentMessage.id,
      message: currentMessage.message,
      sender_id: currentMessage.sender_id,
      is_recalled: currentMessage.is_recalled,
      recall_scope: currentMessage.recall_scope,
      created_at: currentMessage.created_at || currentMessage.timestamp,
    })
    console.log(
      'Danh sách tin nhắn hiện tại:',
      messages.map((msg) => ({
        id: msg.id,
        is_recalled: msg.is_recalled,
        recall_scope: msg.recall_scope,
        message: msg.message.substring(0, 20) + (msg.message.length > 20 ? '...' : ''),
      }))
    )
    try {
      setIsLoading(true)
      console.log('Đang gửi request thu hồi tin nhắn với scope=all', {
        url: `/api/conversations/${selectedId}/messages/${currentMessage.id}/recall`,
        data: {
          scope: 'all',
          _token: 'CSRF_TOKEN_HIDDEN',
        },
      })

      const startTime = new Date().getTime()
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
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      )
      const endTime = new Date().getTime()
      // Log chi tiết response
      console.log(`Thu hồi thành công sau ${endTime - startTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      })
      
      // Kiểm tra kết quả API trả về
      if (!response.data.success) {
        console.error('API trả về thất bại mặc dù status code là 200:', response.data)
        toast.error('Thu hồi tin nhắn thất bại', {
          description: response.data.error || 'Đã xảy ra lỗi khi thu hồi tin nhắn.',
        })
        setRecallDialogOpen(false)
        return
      }
      
      const apiResultData = response.data.result?.data
      if (apiResultData) {
        console.log('Dữ liệu tin nhắn từ API sau khi thu hồi:', {
          id: apiResultData.id,
          is_recalled: apiResultData.is_recalled,
          recall_scope: apiResultData.recall_scope
        })
        
        // Kiểm tra kết quả API xem tin nhắn có thực sự bị thu hồi không
        if (!apiResultData.is_recalled || apiResultData.recall_scope !== 'all') {
          console.warn('API trả về tin nhắn chưa được thu hồi đúng cách (is_recalled hoặc recall_scope không đúng)')
          toast.warning('Có thể đã xảy ra lỗi khi thu hồi tin nhắn', {
            description: 'Trạng thái tin nhắn không được cập nhật đúng. Vui lòng tải lại trang.',
          })
        }
      }
      
      // Reload messages after recall
      console.log('Đang tải lại danh sách tin nhắn sau khi thu hồi...')
      await loadConversation(selectedId)
      
      // Kiểm tra xem tin nhắn đã thực sự được thu hồi chưa
      const recalledMessage = messages.find((msg) => msg.id === currentMessage.id)
      if (recalledMessage) {
        console.log('Trạng thái tin nhắn sau khi tải lại:', {
          id: recalledMessage.id,
          is_recalled: recalledMessage.is_recalled,
          recall_scope: recalledMessage.recall_scope,
          message: recalledMessage.message,
        })
        if (!recalledMessage.is_recalled || recalledMessage.recall_scope !== 'all') {
          console.warn('CHÚ Ý: Tin nhắn có thể chưa được thu hồi đúng cách trên server!')
          
          // Kiểm tra trường hợp cache và thử tải lại lần nữa
          console.log('Thử tải lại dữ liệu lần 2 sau 1 giây để tránh vấn đề cache...')
          setTimeout(async () => {
            await loadConversation(selectedId)
            // Kiểm tra lại sau khi tải
            const recheckedMessage = messages.find((msg) => msg.id === currentMessage.id)
            if (recheckedMessage) {
              console.log('Trạng thái tin nhắn sau khi tải lại lần 2:', {
                id: recheckedMessage.id,
                is_recalled: recheckedMessage.is_recalled,
                recall_scope: recheckedMessage.recall_scope
              })
              
              if (!recheckedMessage.is_recalled || recheckedMessage.recall_scope !== 'all') {
                console.error('CẢNH BÁO NGHIÊM TRỌNG: Tin nhắn vẫn không được thu hồi sau khi tải lại lần 2!')
                toast.error('Tin nhắn không được thu hồi thành công', {
                  description: 'Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                })
              } else {
                console.log('Thu hồi thành công sau khi tải lại lần 2')
              }
            }
          }, 1000)
        } else {
          console.log('Thu hồi tin nhắn thành công và hiển thị đúng trên client')
        }
      } else {
        console.log(
          'Không tìm thấy tin nhắn trong danh sách sau khi tải lại - có thể đã bị xóa hoàn toàn'
        )
      }

      // Chỉ đóng modal sau khi đã hoàn thành việc thu hồi
      setRecallDialogOpen(false)
    } catch (error) {
      console.error('===== LỖI THU HỒI TIN NHẮN CHO TẤT CẢ NGƯỜI DÙNG =====')
      console.error('Chi tiết lỗi:', error)
      // Log chi tiết về lỗi
      if (axios.isAxiosError(error)) {
        const detailsObj = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: JSON.parse(error.config?.data || '{}'),
          },
        }
        console.error('Chi tiết request/response:', detailsObj)
        // Hiển thị thông báo lỗi cụ thể từ server nếu có
        if (error.response?.data?.message) {
          toast.error('Lỗi thu hồi tin nhắn', {
            description: error.response.data.message,
          })
          console.error('Thông báo lỗi từ server:', error.response.data.message)
          // Kiểm tra lỗi cụ thể để hướng dẫn
          if (error.response.data.message.includes('quyền')) {
            console.error('Nguyên nhân có thể: Không có quyền thu hồi tin nhắn này')
          } else if (error.response.data.message.includes('không tồn tại')) {
            console.error('Nguyên nhân có thể: Tin nhắn không tồn tại trên server')
          }
        } else {
          toast.error('Không thể thu hồi tin nhắn', {
            description: 'Vui lòng thử lại sau.',
          })
        }
      } else {
        console.error('Lỗi không xác định khi thu hồi tin nhắn:', error)
        toast.error('Có lỗi xảy ra', {
          description: 'Không thể thu hồi tin nhắn. Vui lòng thử lại sau.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }
  // Thu hồi tin nhắn với bản thân
  const handleRecallForSelf = async () => {
    if (!currentMessage || !selectedId) return
    // Log chi tiết tin nhắn trước khi thu hồi
    console.log('===== TRƯỚC KHI THU HỒI CHO BẢN THÂN =====')
    console.log('Thông tin tin nhắn cần thu hồi:', {
      id: currentMessage.id,
      message: currentMessage.message,
      sender_id: currentMessage.sender_id,
      is_recalled: currentMessage.is_recalled,
      recall_scope: currentMessage.recall_scope,
      created_at: currentMessage.created_at || currentMessage.timestamp,
    })
    try {
      setIsLoading(true)
      console.log('Đang gửi request thu hồi tin nhắn với scope=self', {
        url: `/api/conversations/${selectedId}/messages/${currentMessage.id}/recall`,
        data: { scope: 'self' },
      })
      const startTime = new Date().getTime()
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
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      )
      const endTime = new Date().getTime()
      // Log chi tiết response
      console.log(`Thu hồi thành công sau ${endTime - startTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      })
      // Reload messages after recall
      console.log('Đang tải lại danh sách tin nhắn sau khi thu hồi...')
      await loadConversation(selectedId)
      // Kiểm tra xem tin nhắn đã thực sự được thu hồi chưa
      const recalledMessage = messages.find((msg) => msg.id === currentMessage.id)
      if (recalledMessage) {
        console.log('Trạng thái tin nhắn sau khi tải lại:', {
          id: recalledMessage.id,
          is_recalled: recalledMessage.is_recalled,
          recall_scope: recalledMessage.recall_scope,
          message: recalledMessage.message,
        })

        if (!recalledMessage.is_recalled) {
          console.warn('CHÚ Ý: Tin nhắn chưa được đánh dấu đã thu hồi (is_recalled = false)')
        }
      } else {
        console.log('Không tìm thấy tin nhắn trong danh sách sau khi tải lại')
      }
      // Chỉ đóng modal sau khi đã hoàn thành việc thu hồi
      setRecallDialogOpen(false)
    } catch (error) {
      console.error('===== LỖI THU HỒI TIN NHẮN CHO BẢN THÂN =====')
      console.error('Chi tiết lỗi:', error)
      if (axios.isAxiosError(error)) {
        console.error('Chi tiết lỗi API:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })
      }
      toast.error('Không thể thu hồi tin nhắn', {
        description: 'Vui lòng thử lại sau.',
      })
    } finally {
      setIsLoading(false)
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
