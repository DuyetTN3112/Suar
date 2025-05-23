import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import useTranslation from '@/hooks/use_translation'

interface Participant {
  id: string
  full_name: string
  avatar?: string
  email: string
}

interface Metadata {
  users: Participant[]
}

interface Props {
  metadata: Metadata
  errors?: Record<string, string>
}

export default function CreateConversation({ metadata, errors }: Props) {
  const [title, setTitle] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [initialMessage, setInitialMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    router.post('/conversations', {
      title,
      participants: selectedParticipants,
      initial_message: initialMessage
    }, {
      onFinish: () => setLoading(false)
    })
  }

  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(selectedParticipants.filter(pid => pid !== id))
    } else {
      setSelectedParticipants([...selectedParticipants, id])
    }
  }

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <>
      <Head title={t('conversation.new_conversation', {}, 'Tạo cuộc trò chuyện mới')} />
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{t('conversation.new_conversation', {}, 'Tạo cuộc trò chuyện mới')}</h1>

          {errors && Object.keys(errors).length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('common.error', {}, 'Lỗi')}</AlertTitle>
              <AlertDescription>
                {Object.values(errors).map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>{t('conversation.info', {}, 'Thông tin cuộc trò chuyện')}</CardTitle>
                <CardDescription>
                  {t('conversation.create_description', {}, 'Tạo một cuộc trò chuyện mới và mời những người bạn muốn nói chuyện.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('conversation.title_optional', {}, 'Tiêu đề cuộc trò chuyện (không bắt buộc)')}</Label>
                  <Input
                    id="title"
                    placeholder={t('conversation.title_placeholder', {}, 'Nhập tiêu đề cuộc trò chuyện')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('conversation.title_help', {}, 'Nếu không nhập tiêu đề, tên cuộc trò chuyện sẽ là tên của những người tham gia.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('conversation.participants', {}, 'Người tham gia')}</Label>
                  <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                    {metadata.users && metadata.users.length > 0 ? (
                      <div className="space-y-2">
                        {metadata.users.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={selectedParticipants.includes(user.id)}
                              onCheckedChange={() => toggleParticipant(user.id)}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar || ''} alt={user.full_name} />
                                <AvatarFallback>{getAvatarInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              <Label
                                htmlFor={`user-${user.id}`}
                                className="cursor-pointer flex-1"
                              >
                                <div>{user.full_name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">
                        {t('conversation.no_users', {}, 'Không tìm thấy người dùng nào để thêm vào cuộc trò chuyện.')}
                      </p>
                    )}
                  </div>
                  {errors?.participants && (
                    <p className="text-sm text-destructive">{errors.participants}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initial_message">{t('conversation.first_message', {}, 'Tin nhắn đầu tiên')}</Label>
                  <Textarea
                    id="initial_message"
                    placeholder={t('conversation.first_message_placeholder', {}, 'Nhập tin nhắn đầu tiên của bạn...')}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    rows={4}
                  />
                  {errors?.initial_message && (
                    <p className="text-sm text-destructive">{errors.initial_message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => router.visit('/conversations')}>
                  {t('common.cancel', {}, 'Hủy')}
                </Button>
                <Button type="submit" disabled={selectedParticipants.length === 0 || !initialMessage.trim() || loading}>
                  {loading ? t('common.creating', {}, 'Đang tạo...') : t('conversation.create_button', {}, 'Tạo cuộc trò chuyện')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </>
  )
}

CreateConversation.layout = (page: React.ReactNode) => <AppLayout title="Tạo cuộc trò chuyện mới">{page}</AppLayout> 