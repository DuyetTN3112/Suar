import React, { useState, useEffect, useRef } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistance, format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, Phone, Video, MoreVertical, Send, Loader2, Plus } from 'lucide-react'
import axios from 'axios'
import useTranslation from '@/hooks/use_translation'
import CreateConversationDialog from './components/create_conversation_dialog'

interface Participant {
  id: string
  full_name: string
  avatar?: string
  email: string
  description?: string
}

interface ConversationParticipant {
  user: Participant
}

interface Conversation {
  id: string
  title: string
  updated_at: string
  participants: Participant[]
  conversation_participants: ConversationParticipant[]
  $extras?: {
    unreadCount: number
    lastMessageAt: string | null
  }
}

interface Message {
  id: string
  message: string
  sender_id: string
  timestamp: string
  sender: Participant
  read_at: string | null
  is_current_user?: boolean
}

interface ConversationsProps {
  conversations?: {
    data: Conversation[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export default function Conversations({ conversations }: ConversationsProps) {
  const { url } = usePage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const messagesStartRef = useRef<HTMLDivElement>(null)
  const loggedInUserId = (window as any).auth?.user?.id || ''
  const { t, locale } = useTranslation()
  
  const hasConversations = conversations?.data && conversations.data.length > 0

  useEffect(() => {
    // Kiểm tra URL để xem có conversation ID nào không
    const pathParts = window.location.pathname.split('/')
    if (pathParts.length > 2 && pathParts[1] === 'conversations') {
      const conversationId = pathParts[2]
      // Đảm bảo conversationId không phải là "create"
      if (conversationId && conversationId !== 'create') {
        console.log(`Phát hiện ID cuộc trò chuyện trong URL: ${conversationId}`);
        
        // Tìm conversation từ danh sách nếu có
        const foundConversation = conversations?.data.find(conv => conv.id === conversationId)
        
        // Nếu tìm thấy, thiết lập selectedId và load cuộc trò chuyện
        if (foundConversation) {
          console.log(`Tìm thấy cuộc trò chuyện: ${foundConversation.title || 'Không có tiêu đề'}`);
          setSelectedId(conversationId)
          loadConversation(conversationId)
        } else {
          console.log(`Không tìm thấy cuộc trò chuyện với ID: ${conversationId}`);
          // Nếu không tìm thấy, gọi API để lấy thông tin cuộc trò chuyện
          loadConversation(conversationId)
        }

        // Thay đổi URL mà không reload trang
        const newUrl = `/conversations`;
        window.history.pushState({}, '', newUrl);
      }
    }
  }, [conversations?.data])

  useEffect(() => {
    if (selectedId) {
      loadConversation(selectedId)
    }
  }, [selectedId])

  useEffect(() => {
    if (messages.length > 0) {
      messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const loadConversation = async (conversationId: string) => {
    setIsLoading(true)
    try {
      const response = await axios.get(`/api/conversations/${conversationId}`, {
        params: { page: 1, limit: 50 },
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      
      console.log('API response:', response.data);
      
      setSelectedConversation(response.data.conversation)
      
      // Kiểm tra dữ liệu tin nhắn
      if (response.data.messages) {
        console.log('API response:', response.data);
        
        // Ghi log chi tiết về dữ liệu tin nhắn
        console.log('Tin nhắn từ API:', Array.isArray(response.data.messages) 
          ? response.data.messages.map((m: Message) => ({id: m.id, timestamp: m.timestamp}))
          : response.data.messages);
        
        // Kiểm tra cấu trúc dữ liệu - có thể là mảng trực tiếp hoặc là object với thuộc tính data
        let messagesData = [];
        if (Array.isArray(response.data.messages)) {
          // Kiểm tra tính hợp lệ của mỗi tin nhắn
          messagesData = [...response.data.messages]
            .filter(message => {
              // Loại bỏ tin nhắn không có timestamp hoặc timestamp không hợp lệ
              if (!message.timestamp) {
                console.warn('Tin nhắn thiếu timestamp:', message);
                return false;
              }
              
              // Kiểm tra tính hợp lệ của timestamp
              const timestamp = new Date(message.timestamp);
              if (isNaN(timestamp.getTime())) {
                console.warn('Tin nhắn có timestamp không hợp lệ:', message);
                return false;
              }
              
              return true;
            });
        } else if (response.data.messages.data && Array.isArray(response.data.messages.data)) {
          // Kiểm tra tính hợp lệ của mỗi tin nhắn
          messagesData = [...response.data.messages.data]
            .filter(message => {
              // Loại bỏ tin nhắn không có timestamp hoặc timestamp không hợp lệ
              if (!message.timestamp) {
                console.warn('Tin nhắn thiếu timestamp:', message);
                return false;
              }
              
              // Kiểm tra tính hợp lệ của timestamp
              const timestamp = new Date(message.timestamp);
              if (isNaN(timestamp.getTime())) {
                console.warn('Tin nhắn có timestamp không hợp lệ:', message);
                return false;
              }
              
              return true;
            });
        }
        
        console.log('Dữ liệu tin nhắn sẽ hiển thị:', messagesData.map((m: Message) => ({id: m.id, timestamp: m.timestamp})));
        setMessages(messagesData);
        
        // Thông tin phân trang
        if (response.data.pagination) {
          setHasMore(response.data.pagination.hasMore || false);
        } else {
          setHasMore(false);
        }
      } else {
        console.error('Không có dữ liệu tin nhắn trong phản hồi API:', response.data);
        setMessages([]);
        setHasMore(false);
      }
      
      setCurrentPage(1)
      
      // Đánh dấu tin nhắn đã đọc
      axios.post(`/api/conversations/${conversationId}/mark-as-read`, {}, {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
    } catch (error) {
      console.error('Không thể tải cuộc trò chuyện:', error)
      setMessages([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreMessages = async () => {
    if (!selectedId || !hasMore) return
    
    setIsLoading(true)
    try {
      const response = await axios.get(`/api/conversations/${selectedId}`, {
        params: { page: currentPage + 1, limit: 50 }
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get('/conversations', { search: searchQuery }, { preserveState: true })
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    loadConversation(conversation.id);
  }

  const getConversationName = (conversation: Conversation) => {
    if (conversation.title) return conversation.title

    // Nếu không có title, lấy tên người tham gia
    return conversation.conversation_participants
      .map(cp => cp.user.full_name)
      .filter(name => name)
      .join(', ')
  }

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        console.warn('formatDate: Chuỗi thời gian rỗng');
        return t('conversation.date_unknown', {}, 'Không xác định');
      }
      
      const date = new Date(dateString);
      
      // Kiểm tra xem date có hợp lệ không
      if (isNaN(date.getTime())) {
        console.warn('formatDate: Chuỗi thời gian không hợp lệ:', dateString);
        return t('conversation.date_unknown', {}, 'Không xác định');
      }
      
      // Chọn ngôn ngữ phù hợp với locale hiện tại
      const dateLocale = locale === 'vi' ? vi : enUS;
      
      return formatDistance(date, new Date(), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch (error) {
      console.error('formatDate: Lỗi xử lý thời gian:', error, dateString);
      return t('conversation.date_unknown', {}, 'Không xác định');
    }
  }

  const formatMessageDate = (dateString: string) => {
    try {
      if (!dateString) {
        console.warn('formatMessageDate: Chuỗi thời gian rỗng');
        return t('conversation.date_unknown', {}, 'Không xác định');
      }
      
      const date = new Date(dateString);
      
      // Kiểm tra xem date có hợp lệ không
      if (isNaN(date.getTime())) {
        console.warn('formatMessageDate: Chuỗi thời gian không hợp lệ:', dateString);
        return t('conversation.date_unknown', {}, 'Không xác định');
      }
      
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('formatMessageDate: Lỗi xử lý thời gian:', error, dateString);
      return t('conversation.date_unknown', {}, 'Không xác định');
    }
  }

  // Nhóm tin nhắn theo ngày
  const groupMessagesByDate = (msgs: Message[] | undefined) => {
    if (!msgs || !Array.isArray(msgs)) {
      return [];
    }
    
    const groups: { [key: string]: Message[] } = {}
    
    msgs.forEach(message => {
      try {
        if (!message.timestamp) {
          console.warn('Tin nhắn không có timestamp:', message);
          return; // Bỏ qua tin nhắn không có timestamp
        }
        
        const date = new Date(message.timestamp);
        
        // Kiểm tra xem date có hợp lệ không
        if (isNaN(date.getTime())) {
          console.warn('Timestamp không hợp lệ:', message.timestamp);
          return; // Bỏ qua timestamp không hợp lệ
        }
        
        const dateKey = format(date, 'dd/MM/yyyy');
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        
        groups[dateKey].push(message);
      } catch (error) {
        console.error('Lỗi xử lý timestamp:', error, message);
        // Bỏ qua tin nhắn gây lỗi
      }
    })
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }))
  }

  const getOtherParticipant = () => {
    // Tìm người tham gia khác trong cuộc trò chuyện 1-1
    if (selectedConversation && selectedConversation.conversation_participants.length === 2) {
      const otherParticipant = selectedConversation.conversation_participants.find(
        cp => cp.user.id !== loggedInUserId
      )
      return otherParticipant?.user
    }
    return null
  }

  const messageGroups = groupMessagesByDate(messages)
  const otherParticipant = getOtherParticipant()

  // Sau khi đã khai báo loadConversation, thêm useEffect vào sau đây
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

  return (
    <>
      <Head title={t('conversations.title', {}, 'Hội thoại')} />
      <div className="container py-6">
        <div className="flex justify-between mb-6 items-center">
          <h1 className="text-3xl font-bold">{t('conversations.title', {}, 'Hội thoại')}</h1>
          <CreateConversationDialog 
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('conversation.create_new', {}, 'Tạo cuộc trò chuyện mới')}
              </Button>
            }
          />
        </div>
        
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* Danh sách cuộc trò chuyện */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <form onSubmit={handleSearch}>
                <Input
                  placeholder={t('conversations.search', {}, 'Tìm kiếm cuộc trò chuyện...')}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!hasConversations ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('conversation.no_conversations', {}, 'Chưa có cuộc trò chuyện nào')}
                </div>
              ) : (
                <div>
                  {conversations.data.map((conversation) => (
                    <div 
                      key={conversation.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedId(conversation.id);
                        loadConversation(conversation.id);
                      }}
                      className={`p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer ${
                        selectedId === conversation.id ? 'bg-muted/50' : ''
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={getConversationName(conversation)} />
                        <AvatarFallback>
                          {getAvatarInitials(getConversationName(conversation))}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{getConversationName(conversation)}</h3>
                          <span className="text-xs text-muted-foreground">
                            {conversation.updated_at && formatDate(conversation.updated_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.conversation_participants.length > 2 
                              ? t('conversation.participant_count', { count: conversation.conversation_participants.length }, `${conversation.conversation_participants.length} người tham gia`) 
                              : ''}
                          </p>
                          {conversation.$extras && conversation.$extras.unreadCount > 0 && (
                            <Badge variant="destructive" className="rounded-full">
                              {conversation.$extras.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right section - Chat view */}
          <div className="flex-1 flex flex-col">
            {selectedId && selectedConversation ? (
              <div className="flex-1 flex flex-col">
                {/* Chat header */}
                <div className="p-4 border-b flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={otherParticipant?.avatar || ''} 
                        alt={otherParticipant?.full_name || getConversationName(selectedConversation)} 
                      />
                      <AvatarFallback>
                        {getAvatarInitials(otherParticipant?.full_name || getConversationName(selectedConversation))}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">
                        {otherParticipant?.full_name || getConversationName(selectedConversation)}
                      </h2>
                      {otherParticipant?.description ? (
                        <p className="text-sm text-muted-foreground">{otherParticipant.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t('conversation.participant_count', { count: selectedConversation.conversation_participants.length }, `${selectedConversation.conversation_participants.length} người tham gia`)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" title={t('conversation.call', {}, 'Gọi điện')}>
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" title={t('conversation.video_call', {}, 'Gọi video')}>
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" title={t('common.more', {}, 'Thêm')}>
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {isLoading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div ref={messagesStartRef} />
                      
                      {messageGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-4">
                          <div className="flex items-center justify-center my-4">
                            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                              {group.date}
                            </div>
                          </div>

                          {group.messages.map((message) => {
                            try {
                              // Kiểm tra dữ liệu tin nhắn trước khi render
                              if (!message.id || !message.sender_id) {
                                console.warn('Tin nhắn thiếu thông tin cần thiết:', message);
                                return null; // Bỏ qua tin nhắn không đủ thông tin
                              }
                              
                              // Sử dụng is_current_user từ backend nếu có, nếu không có thì so sánh sender_id
                              const isOutgoing = message.is_current_user === true || message.sender_id === loggedInUserId;
                              
                              // Xác định xem có hiển thị thông tin người gửi hay không
                              // Luôn hiển thị cho tin nhắn từ người khác trong cuộc trò chuyện nhiều người
                              const showSenderInfo = !isOutgoing && (selectedConversation?.conversation_participants.length > 2);
                              
                              return (
                                <div key={message.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
                                  {!isOutgoing && (
                                    <div className="flex-shrink-0 mr-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={message.sender?.avatar || ''} alt={message.sender?.full_name || t('conversation.user', {}, 'Người dùng')} />
                                        <AvatarFallback>{message.sender?.full_name ? getAvatarInitials(message.sender.full_name) : 'UN'}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col max-w-[70%]">
                                    {/* Luôn hiển thị tên người gửi cho tin nhắn đến trong cuộc trò chuyện nhóm */}
                                    {!isOutgoing && (
                                      <span className="text-xs font-medium text-slate-600 mb-1 ml-1">
                                        {message.sender?.full_name || t('conversation.user', {}, 'Người dùng')}
                                      </span>
                                    )}
                                    
                                    <div className={`px-3 py-2 rounded-2xl ${
                                      isOutgoing 
                                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                                        : 'bg-muted text-foreground rounded-bl-none'
                                    }`}>
                                      <p className="break-words">{message.message}</p>
                                      <div className={`text-xs mt-1 text-right ${
                                        isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                      }`}>
                                        {formatMessageDate(message.timestamp)}
                                        {isOutgoing && ` • ${t('conversation.you', {}, 'Bạn')}`}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {isOutgoing && (
                                    <div className="flex-shrink-0 ml-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={(window as any).auth?.user?.avatar || ''} alt={(window as any).auth?.user?.full_name || t('conversation.you', {}, 'Bạn')} />
                                        <AvatarFallback>{getAvatarInitials((window as any).auth?.user?.full_name || t('conversation.you', {}, 'Bạn'))}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (error) {
                              console.error('Lỗi rendering tin nhắn:', error, message);
                              return null; // Bỏ qua tin nhắn gây lỗi khi render
                            }
                          })}
                        </div>
                      ))}
                      
                      {hasMore && (
                        <div className="flex justify-center mt-4">
                          <Button 
                            variant="outline" 
                            onClick={loadMoreMessages}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            {t('conversation.load_more', {}, 'Tải thêm tin nhắn')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Message input */}
                <div className="p-4 border-t">
                  <form 
                    method="POST" 
                    action={`/conversations/${selectedId}/messages`}
                    target="hidden-frame" 
                    onSubmit={() => {
                      if (newMessage.trim()) {
                        // Reset form sau 1 giây để giả lập gửi tin nhắn
                        setTimeout(() => {
                          setNewMessage('')
                          // Tải lại tin nhắn sau khi gửi
                          loadConversation(selectedId)
                        }, 1000)
                      }
                    }}
                  >
                    {/* Thêm CSRF token field - quan trọng cho Laravel */}
                    <input 
                      type="hidden" 
                      name="_token" 
                      value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''}
                    />
                    
                    {/* Field tin nhắn */}
                    <input type="hidden" name="content" value={newMessage} />
                    <input type="hidden" name="message" value={newMessage} />
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        name="message_display"
                        placeholder={t('conversation.message_placeholder', {}, 'Nhập tin nhắn của bạn...')}
                        className="flex-1"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <Button 
                        type="submit" 
                        disabled={!newMessage.trim()} 
                        size="icon"
                        className="h-10 w-10 rounded-full"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                  
                  {/* iframe ẩn để nhận phản hồi từ form submit mà không làm mới trang */}
                  <iframe name="hidden-frame" style={{display: 'none'}}></iframe>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center space-y-2">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <h3 className="text-lg font-medium">{t('conversation.no_messages_selected', {}, 'Chưa có tin nhắn nào được chọn')}</h3>
                      <p className="text-muted-foreground">{t('conversation.select_or_create', {}, 'Chọn một cuộc trò chuyện từ danh sách để bắt đầu hoặc tạo mới')}</p>
                      <CreateConversationDialog 
                        trigger={
                          <Button className="mt-4">
                            {t('conversation.create_button', {}, 'Tạo cuộc trò chuyện mới')}
                          </Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Không sử dụng useTranslation trong layout function
Conversations.layout = (page: React.ReactNode) => <AppLayout title="Tin nhắn">{page}</AppLayout> 