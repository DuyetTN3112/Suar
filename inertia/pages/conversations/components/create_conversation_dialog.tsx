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
  const [existingConversation, setExistingConversation] = useState<{id: string, title: string} | null>(null)
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
      console.log('Tổ chức hiện tại:', page.props.auth?.user?.current_organization_id)
      
      // Sử dụng API endpoint mới đơn giản hơn
      const response = await axios.get('/api/users-in-organization')
      
      if (response.data.success && response.data.users && Array.isArray(response.data.users)) {
        // Lọc ra người dùng hiện tại để không hiển thị trong danh sách
        const currentUserId = page.props.auth?.user?.id
        const filteredUsers = response.data.users.filter((user: Participant) => user.id !== currentUserId)
        
        setUsers(filteredUsers)
        console.log('Đã tải', filteredUsers.length, 'người dùng trong tổ chức (đã loại trừ người dùng hiện tại)')
        console.log('Danh sách người dùng:', filteredUsers)
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
        console.error('Mã lỗi HTTP:', error.response.status)
        if (error.response.data.message) {
          setErrors({
            api_error: error.response.data.message
          })
        }
      } else if (error.request) {
        console.error('Không nhận được phản hồi từ server:', error.request)
      } else {
        console.error('Lỗi cấu hình request:', error.message)
      }
    }
  }

  // Kiểm tra xem cuộc hội thoại với những người tham gia đã chọn đã tồn tại hay chưa
  const checkExistingConversation = async () => {
    if (selectedParticipants.length === 0) {
      console.log('Không có người tham gia nào được chọn, bỏ qua kiểm tra')
      return false;
    }

    try {
      console.log('=== DEBUG KIỂM TRA HỘI THOẠI TỒN TẠI ===');
      console.log('Đang kiểm tra cuộc hội thoại đã tồn tại...');
      console.log('Người tham gia đã chọn:', selectedParticipants);
      
      // Thêm ID người dùng hiện tại vào danh sách kiểm tra nếu chưa có
      const currentUserId = page.props.auth?.user?.id;
      console.log('ID người dùng hiện tại:', currentUserId);
      
      let participantsToCheck = [...selectedParticipants];
      
      if (currentUserId && !participantsToCheck.includes(currentUserId)) {
        console.log('Thêm người dùng hiện tại vào danh sách kiểm tra:', currentUserId);
        participantsToCheck.push(currentUserId);
      }
      
      console.log('Danh sách người tham gia cuối cùng để kiểm tra:', participantsToCheck);
      
      // Tạo payload để gửi đi
      const payload = {
        participants: participantsToCheck
      };
      console.log('Payload gửi đi:', payload);
      
      // Sử dụng withCredentials để đảm bảo cookie được gửi đi
      console.log('Gửi request kiểm tra cuộc hội thoại đã tồn tại...');
      const response = await axios.post('/api/check-existing-conversation', payload, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      
      console.log('Nhận được phản hồi từ API kiểm tra cuộc hội thoại:');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Data:', response.data);
      
      if (response.data.exists && response.data.conversation) {
        console.log('Đã tìm thấy cuộc hội thoại tương tự:', response.data.conversation);
        setExistingConversation(response.data.conversation);
        return true;
      } else {
        console.log('Không tìm thấy cuộc hội thoại tương tự');
        setExistingConversation(null);
        return false;
      }
    } catch (error) {
      console.error('=== LỖI KIỂM TRA HỘI THOẠI TỒN TẠI ===');
      console.error('Lỗi khi kiểm tra cuộc hội thoại đã tồn tại:', error);
      
      // Log chi tiết lỗi
      if (error.response) {
        console.error('Chi tiết lỗi từ API:');
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', error.response.data);
        
        // Nếu lỗi là 302 Found hoặc 401 Unauthorized, có thể là vấn đề xác thực
        if (error.response.status === 302 || error.response.status === 401) {
          console.error('Có vẻ như có vấn đề với xác thực hoặc chuyển hướng');
          console.error('URL chuyển hướng:', error.response.headers.location);
          setErrors({
            api_error: `Không thể kiểm tra cuộc hội thoại đã tồn tại. Vui lòng thử lại sau.`
          });
        }
      } else if (error.request) {
        console.error('Không nhận được phản hồi từ server:', error.request);
        setErrors({
          api_error: `Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối mạng.`
        });
      } else {
        console.error('Lỗi cấu hình request:', error.message);
        console.error('Stack trace:', error.stack);
        setErrors({
          api_error: `Lỗi khi gửi yêu cầu: ${error.message}`
        });
      }
      
      return false;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors(null)
    
    console.log('=== DEBUG TẠO HỘI THOẠI ===')
    console.log('Bắt đầu tạo cuộc hội thoại mới...')
    console.log('Tiêu đề:', title)
    console.log('Người tham gia đã chọn:', selectedParticipants)
    console.log('Thông tin người dùng hiện tại:', page.props.auth?.user)
    console.log('Tổ chức hiện tại:', page.props.auth?.user?.current_organization_id)
    
    if (selectedParticipants.length === 0) {
      console.log('Lỗi: Không có người tham gia nào được chọn')
      setLoading(false)
      setErrors({
        participants: t('conversation.no_participants_selected', {}, 'Vui lòng chọn ít nhất một người tham gia')
      })
      return
    }
    
    try {
      // Kiểm tra xem cuộc hội thoại đã tồn tại chưa
      console.log('Bắt đầu kiểm tra cuộc hội thoại đã tồn tại...')
      const conversationExists = await checkExistingConversation()
      console.log('Kết quả kiểm tra cuộc hội thoại đã tồn tại:', conversationExists)
      
      if (conversationExists && existingConversation) {
        console.log('Đã tìm thấy cuộc hội thoại tương tự đã tồn tại:', existingConversation)
        setLoading(false)
        setErrors({
          existing_conversation: t(
            'conversation.already_exists',
            { title: existingConversation.title },
            `Cuộc hội thoại với những người này đã tồn tại: "${existingConversation.title}"`
          )
        })
        return
      }
      
      console.log('Không tìm thấy cuộc hội thoại tương tự, tiến hành tạo mới...')
      
      // Tạo payload để gửi đi
      const payload = {
        title,
        participants: selectedParticipants,
        initial_message: ' ' // Gửi khoảng trắng để tránh lỗi validation nếu cần
      }
      
      console.log('Payload gửi đi:', payload)
      
      // Thử gửi request trực tiếp bằng axios trước để debug
      try {
        console.log('Thử gửi request trực tiếp bằng axios...')
        const axiosResponse = await axios.post('/conversations', payload, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        })
        console.log('Kết quả từ axios:', axiosResponse)
      } catch (axiosError) {
        console.error('Lỗi khi gửi request trực tiếp bằng axios:', axiosError)
        if (axiosError.response) {
          console.error('Chi tiết lỗi từ API:', axiosError.response.data)
          console.error('Mã lỗi HTTP:', axiosError.response.status)
        }
      }
      
      // Tiếp tục sử dụng router.post
      console.log('Tiếp tục sử dụng router.post...')
      router.post('/conversations', payload, {
        onSuccess: (page) => {
          console.log('Tạo cuộc hội thoại thành công:', page)
          setOpen(false)
          setTitle('')
          setSelectedParticipants([])
          setLoading(false)
        },
        onError: (errors) => {
          console.error('Lỗi khi tạo cuộc hội thoại:', errors)
          console.error('Chi tiết lỗi:', JSON.stringify(errors))
          setErrors(errors)
          setLoading(false)
        }
      })
    } catch (error) {
      console.error('Lỗi không xác định khi tạo cuộc hội thoại:', error)
      console.error('Chi tiết lỗi:', error.message)
      if (error.response) {
        console.error('Chi tiết lỗi từ API:', error.response.data)
        console.error('Mã lỗi HTTP:', error.response.status)
      } else if (error.request) {
        console.error('Không nhận được phản hồi từ server:', error.request)
      }
      setLoading(false)
      setErrors({
        api_error: t('conversation.create_error', {}, 'Đã xảy ra lỗi khi tạo cuộc hội thoại. Vui lòng thử lại sau.')
      })
    }
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
            <AlertTitle>
              {errors.existing_conversation
                ? t('conversation.existing_conversation', {}, 'Cuộc hội thoại đã tồn tại')
                : t('common.error', {}, 'Lỗi')}
            </AlertTitle>
            <AlertDescription>
              {Object.values(errors).map((error, index) => (
                <div key={index}>{error}</div>
              ))}
              {errors.existing_conversation && existingConversation && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    router.visit(`/conversations/${existingConversation.id}`);
                    setOpen(false);
                  }}
                >
                  {t('conversation.open_existing', {}, 'Mở cuộc hội thoại')}
                </Button>
              )}
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