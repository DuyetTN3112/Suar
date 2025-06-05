import React from 'react'
import type { MessageGroup } from './types'
import { MessageItem } from './message_item'

interface MessageGroupProps {
  group: MessageGroup
  loggedInUserId: string
  loggedInUser?: unknown
  loggedInUserAvatar?: string
  loggedInUserName?: string
  showMultiUserUI?: boolean
}

export const MessageGroupComponent: React.FC<MessageGroupProps> = ({
  group,
  loggedInUserId,
  loggedInUserAvatar,
  loggedInUserName,
  showMultiUserUI = false
}) => {
  return (
    <div key={group.date} className="space-y-4">
      <div className="flex items-center justify-center my-4">
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
          {group.date}
        </div>
      </div>

      {group.messages.map((message) => {
        // Sử dụng is_current_user từ backend nếu có, nếu không có thì so sánh sender_id
        const isOutgoing = message.is_current_user === true || message.sender_id === loggedInUserId

        // Xác định xem có hiển thị thông tin người gửi hay không
        // Hiển thị cho tin nhắn từ người khác trong cuộc trò chuyện nhiều người
        const showSenderInfo = !isOutgoing && showMultiUserUI

        return (
          <MessageItem
            key={message.id}
            message={message}
            isOutgoing={isOutgoing}
            loggedInUserAvatar={loggedInUserAvatar}
            loggedInUserName={loggedInUserName}
            showSenderInfo={showSenderInfo}
          />
        )
      })}
    </div>
  )
}
