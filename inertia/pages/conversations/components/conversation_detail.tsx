import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Phone, Video, MoreVertical, MoreHorizontal, Copy, Share, Trash } from 'lucide-react'
import { Conversation, Message } from '../types'
import { getAvatarInitials, formatMessageDate, groupMessagesByDate, getConversationInfo, calculateMessageSize } from '../utils/conversation_utils'
import useTranslation from '@/hooks/use_translation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu'

interface ConversationDetailProps {
  conversation: Conversation
  messages: Message[]
  loggedInUserId: string
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onRecallMessage: (message: Message) => void
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
  messages,
  loggedInUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onRecallMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Nhóm tin nhắn theo ngày
  const messageGroups = groupMessagesByDate(messages)

  // Lấy thông tin cuộc trò chuyện
  const conversationInfo = getConversationInfo(conversation, loggedInUserId, t)

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-15rem)] max-h-[calc(100vh-15rem)] w-full min-w-0 overflow-hidden">
      {/* Chat header */}
      <div className="p-4 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" alt={conversationInfo.title} />
            <AvatarFallback>
              {getAvatarInitials(conversationInfo.title)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">
              {conversationInfo.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('conversation.participant_count',
                { count: conversationInfo.participantCount },
                `${conversationInfo.participantCount} người tham gia`)}
            </p>
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
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
        style={{
          flex: '1 1 auto',
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t('conversation.load_more', {}, 'Tải thêm tin nhắn')}
                </Button>
              </div>
            )}

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
                      // Only log in development
                      if (process.env.NODE_ENV === 'development') {
                        console.warn('Tin nhắn thiếu thông tin cần thiết')
                      }
                      return null // Bỏ qua tin nhắn không đủ thông tin
                    }

                    // Sử dụng is_current_user từ backend nếu có, nếu không có thì so sánh sender_id
                    const isOutgoing = message.is_current_user === true || message.sender_id === loggedInUserId

                    // Xác định xem có hiển thị thông tin người gửi hay không
                    // Luôn hiển thị cho tin nhắn từ người khác trong cuộc trò chuyện nhiều người
                    const participants = conversation.conversation_participants || []
                    const showSenderInfo = !isOutgoing && (participants.length > 2)

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

                        <div className="flex flex-col max-w-[70%] min-w-0">
                          {/* Luôn hiển thị tên người gửi cho tin nhắn đến trong cuộc trò chuyện nhóm */}
                          {!isOutgoing && showSenderInfo && (
                            <span className="text-xs font-medium text-slate-600 mb-1 ml-1">
                              {message.sender?.full_name || t('conversation.user', {}, 'Người dùng')}
                            </span>
                          )}

                          <div className={`group relative px-3 py-2 rounded-2xl ${
                            isOutgoing
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted text-foreground rounded-bl-none'
                          }`}>
                            {message.is_recalled ? (
                              <p className="break-words italic text-muted-foreground">
                                {message.recall_scope === 'all'
                                  ? t('conversation.message_recalled_all', {}, 'Tin nhắn này đã bị thu hồi')
                                  : t('conversation.message_recalled_self', {}, 'Bạn đã thu hồi tin nhắn này')}
                              </p>
                            ) : (
                              <p className="break-words whitespace-pre-wrap" style={{
                                wordBreak: 'break-all',
                                overflowWrap: 'break-word',
                                wordWrap: 'break-word',
                                maxWidth: '100%',
                                width: '100%',
                              }}>{message.message}</p>
                            )}

                            <div className={`flex items-center justify-end text-xs mt-1 ${
                              isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              <span className="flex-grow text-right">
                                {formatMessageDate(message.created_at || message.timestamp || '')}
                                {isOutgoing && ` • ${t('conversation.you', {}, 'Bạn')}`}
                                {/* Hiển thị dung lượng tin nhắn */}
                                <span className="ml-1">• {calculateMessageSize(message.message)}</span>
                              </span>

                              {!message.is_recalled && isOutgoing && (
                                <div className={`absolute ${isOutgoing ? 'right-[calc(100%+2px)]' : 'left-[calc(100%+2px)]'} top-1/2 -translate-y-1/2`}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 rounded-full bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOutgoing ? "start" : "end"}>
                                      {isOutgoing && (
                                        <DropdownMenuItem
                                          onClick={() => onRecallMessage(message)}
                                          className="text-destructive"
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          {t('conversation.recall_message', {}, 'Thu hồi tin nhắn')}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => {
                                        navigator.clipboard.writeText(message.message)
                                      }}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        {t('conversation.copy', {}, 'Sao chép')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {}}>
                                        <Share className="mr-2 h-4 w-4" />
                                        {t('conversation.share', {}, 'Chia sẻ')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
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
                    )
                  } catch (error) {
                    // Only log in development
                    if (process.env.NODE_ENV === 'development') {
                      console.error('Lỗi rendering tin nhắn:', error)
                      console.error('Message data:', message)
                    }
                    return null // Bỏ qua tin nhắn gây lỗi khi render
                  }
                })}
              </div>
            ))}

            {/* Phần tử để cuộn đến cuối danh sách tin nhắn */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationDetail
