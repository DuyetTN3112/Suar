import React, { useState, useEffect } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import useTranslation from '@/hooks/use_translation'
import axios from 'axios'

interface Participant {
  id: string
  full_name: string
  avatar?: string
  email: string
}

interface CreateConversationDialogProps {
  trigger?: React.ReactNode
}

export function CreateConversationDialog({ trigger }: CreateConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string> | null>(null)
  const [users, setUsers] = useState<Participant[]>([])
  const { t } = useTranslation()
  const page = usePage<{ auth?: { user?: any } }>()

  // Tải danh sách người dùng trong tổ chức khi mở dialog
  useEffect(() => {
    if (open) {
      // Debug thông tin người dùng và tổ chức hiện tại
      console.log('Auth user debug:', {
        user_id: page.props.auth?.user?.id,
        current_organization_id: page.props.auth?.user?.current_organization_id,
      })
      
      fetchOrganizationUsers()
    }
  }, [open])

  const fetchOrganizationUsers = async () => {
    try {
      console.log('Đang tải danh sách người dùng trong tổ chức...')
      
      // Sử dụng API endpoint mới đơn giản hơn
      const response = await axios.get('/api/users-in-organization')
      
      if (response.data.success && response.data.users && Array.isArray(response.data.users)) {
        setUsers(response.data.users)
        console.log('Đã tải', response.data.users.length, 'người dùng trong tổ chức')
      } else {
        console.warn('Định dạng dữ liệu không đúng hoặc không có người dùng:', response.data)
        setUsers([])
      }
    } catch (error) {
      console.error('Không thể tải danh sách người dùng trong tổ chức:', error)
      
      // Hiển thị lỗi trong component thay vì dùng dữ liệu mẫu
      setUsers([])
      setErrors({
        api_error: `Lỗi khi lấy danh sách người dùng: ${error.message || 'Lỗi không xác định'}`
      })
      
      // Nếu là lỗi phản hồi từ API, hiển thị thông tin chi tiết hơn
      if (error.response && error.response.data) {
        console.error('Chi tiết lỗi từ API:', error.response.data)
        if (error.response.data.message) {
          setErrors({
            api_error: error.response.data.message
          })
        }
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors(null)

    router.post('/conversations', {
      title,
      participants: selectedParticipants,
      initial_message: ' ' // Gửi khoảng trắng để tránh lỗi validation nếu cần
    }, {
      onSuccess: () => {
        setOpen(false)
        setTitle('')
        setSelectedParticipants([])
        setLoading(false)
      },
      onError: (errors) => {
        setErrors(errors)
        setLoading(false)
      }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default">
            {t('conversation.create_new', {}, 'Tạo cuộc trò chuyện mới')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('conversation.new_conversation', {}, 'Tạo cuộc trò chuyện mới')}</DialogTitle>
          <DialogDescription>
            {t('conversation.create_description', {}, 'Tạo một cuộc trò chuyện mới và mời những người bạn muốn nói chuyện.')}
          </DialogDescription>
        </DialogHeader>

        {errors && Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('common.error', {}, 'Lỗi')}</AlertTitle>
            <AlertDescription>
              {Object.values(errors).map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
              {users && users.length > 0 ? (
                <div className="space-y-1">
                  {users.map((user) => (
                    <div 
                      key={user.id} 
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                        selectedParticipants.includes(user.id) ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => toggleParticipant(user.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || ''} alt={user.full_name} />
                          <AvatarFallback>{getAvatarInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div>{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        {selectedParticipants.includes(user.id) && (
                          <div className="flex-shrink-0 ml-auto">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-2">
                  {t('conversation.no_users', {}, 'Không tìm thấy người dùng nào để thêm vào cuộc trò chuyện.')}
                </p>
              )}
            </div>
            {errors?.participants && (
              <p className="text-sm text-destructive">{errors.participants}</p>
            )}
            
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedParticipants.map(id => {
                  const user = users.find(u => u.id === id)
                  return user ? (
                    <div key={id} className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs flex items-center">
                      {user.full_name}
                      <button 
                        type="button" 
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleParticipant(id)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              {t('common.cancel', {}, 'Hủy')}
            </Button>
            <Button type="submit" disabled={selectedParticipants.length === 0 || loading}>
              {loading ? t('common.creating', {}, 'Đang tạo...') : t('conversation.create_button', {}, 'Tạo cuộc trò chuyện')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateConversationDialog 