import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar/index'
import { getIconComponent } from '@/components/icons'
import { router } from '@inertiajs/react'
import { usePage } from '@inertiajs/react'
import { useSidebar } from '@/components/ui/sidebar'

// Hàm log debug thông tin chỉ trong môi trường development và chỉ khi cần thiết
const debugLog = (message: string, ...args: any[]) => {
  if (window.DEBUG_MODE && process.env.NODE_ENV === 'development') {
    console.log(message, ...args);
  }
};

// Định nghĩa interface cho team/organization
interface Organization {
  id?: string
  name: string
  logo?: string
  plan?: string
}

interface AuthUser {
  id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  avatar?: string
  username?: string
  organizations?: Organization[]
  current_organization_id?: string
}

interface PageProps {
  user?: {
    auth?: {
      user?: AuthUser
    }
  }
  [key: string]: any
}

export function TeamSwitcher() {
  const page = usePage<PageProps>()
  const [open, setOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<Organization | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const { isMobile } = useSidebar()
  
  // Truy cập an toàn props của auth - Đường dẫn truy cập đúng từ props
  const authUser: AuthUser | null = page.props.user?.auth?.user || null
  
  // Kiểm tra thông tin user nhưng không log chi tiết
  React.useEffect(() => {
    if (!window.DEBUG_MODE || process.env.NODE_ENV !== 'development') return;
    
    if (!authUser) {
      console.error('TeamSwitcher: Không tìm thấy thông tin người dùng trong props')
    } else if (!authUser.organizations?.length) {
      console.error('TeamSwitcher: Không tìm thấy thông tin tổ chức')
    }
  }, [authUser])
  
  // Di chuyển việc cập nhật state error vào useEffect
  React.useEffect(() => {
    if (!authUser) {
      setError('Không tìm thấy thông tin người dùng trong props')
    } else if (!authUser.organizations?.length) {
      setError('Không tìm thấy thông tin tổ chức từ backend')
    } else {
      setError(null)
    }
  }, [authUser])
  
  // Lấy danh sách tổ chức từ backend
  const organizations: Organization[] = React.useMemo(() => {
    // Chỉ sử dụng dữ liệu từ backend, không dùng dữ liệu mẫu
    if (authUser?.organizations?.length) {
      // Chuyển đổi từ dữ liệu backend sang định dạng hiển thị
      return authUser.organizations.map(org => ({
        id: org.id,
        name: org.name,
        logo: org.logo || 'Building', 
        plan: org.plan || 'Miễn phí'
      }));
    }
    
    debugLog('Không tìm thấy thông tin tổ chức từ backend');
    return [] // Trả về mảng rỗng thay vì dữ liệu mẫu
  }, [authUser?.organizations])

  // Lấy current_organization_id từ user
  React.useEffect(() => {
    if (authUser?.current_organization_id && organizations.length > 0) {
      const currentOrg = organizations.find(org => org.id === authUser.current_organization_id)
      if (currentOrg) {
        setSelectedTeam(currentOrg)
      } else {
        setSelectedTeam(organizations[0])
      }
    } else if (organizations.length > 0) {
      setSelectedTeam(organizations[0])
    }
  }, [organizations, authUser?.current_organization_id])

  // Xử lý sự kiện chọn tổ chức
  const handleSelect = (organization: Organization) => {
    setSelectedTeam(organization)
    setOpen(false)
    setError(null)
    
    if (organization.id) {
      // Chuyển đổi id thành chuỗi trước khi gọi trim
      const orgId = String(organization.id).trim()
      if (!orgId) {
        console.error('ID tổ chức sau khi trim là rỗng')
        setError('ID tổ chức không hợp lệ')
        return
      }
      
      // Ngăn chặn nhiều lần nhấp
      if (isLoading) return
      setIsLoading(true)
      
      // Sử dụng router.post theo cách SPA
      router.post('/switch-organization', 
        { organization_id: orgId },
        { 
          preserveState: true, // Giữ trạng thái của các props không cập nhật
          preserveScroll: true, // Giữ vị trí cuộn trang
          only: ['auth'], // Chỉ cập nhật auth trong props
          onBefore: () => {
            debugLog('Đang chuyển tổ chức sang ID:', orgId)
            if (!orgId) {
              console.error('ID tổ chức trống, hủy request')
              setError('ID tổ chức không hợp lệ')
              setIsLoading(false)
              return false
            }
            return true
          },
          onSuccess: () => {
            debugLog('Chuyển đổi tổ chức thành công')
            // Tải lại toàn bộ trang để đảm bảo dữ liệu mới từ server
            window.location.reload()
          },
          onError: (errors) => {
            console.error('Lỗi khi chuyển đổi tổ chức:', errors)
            setError('Có lỗi xảy ra khi chuyển đổi tổ chức')
            setIsLoading(false)
          }
        }
      )
    } else {
      console.error('Không thể chuyển đổi: ID tổ chức không tồn tại')
      setError('ID tổ chức không hợp lệ')
    }
  }

  // Hàm chuyển đến trang tạo tổ chức mới
  const goToCreateOrganization = () => {
    router.visit('/organizations/create')
    setOpen(false)
  }

  // Nếu không có dữ liệu người dùng hoặc tổ chức, hiển thị thông báo hoặc để trống
  if (error || organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="w-full"
            aria-label="Không có tổ chức"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback>!</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Không có tổ chức</span>
              <span className="truncate text-xs text-red-500">
                {error || 'Không có dữ liệu tổ chức'}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              role="combobox"
              aria-expanded={open}
              aria-label="Chọn tổ chức"
              size="lg"
              className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip="Tổ chức"
              disabled={isLoading}
            >
              {selectedTeam ? (
                <>
                  <Avatar className="h-8 w-8 rounded-lg !block">
                    <AvatarFallback className="!block">
                      {React.createElement(getIconComponent(selectedTeam.logo || 'Building'), { className: 'h-4 w-4' })}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{selectedTeam.name}</span>
                    <span className="truncate text-xs">{selectedTeam.plan || 'Miễn phí'}</span>
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-8 w-8 rounded-lg !block">
                    <AvatarFallback className="!block">?</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Chưa chọn tổ chức</span>
                    <span className="truncate text-xs">Vui lòng chọn</span>
                  </div>
                </>
              )}
              {isLoading ? (
                <div className="ml-auto h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
              ) : (
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel>Tổ chức</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <div className="max-h-60 overflow-y-auto">
                {organizations.map((organization) => (
                  <DropdownMenuItem 
                    key={organization.id || organization.name}
                    onSelect={() => handleSelect(organization)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-left text-sm",
                      selectedTeam?.id === organization.id && "bg-secondary"
                    )}
                  >
                    <Avatar className="h-6 w-6 rounded-lg">
                      <AvatarFallback>
                        {React.createElement(getIconComponent(organization.logo || 'Building'), { className: 'h-4 w-4' })}
                      </AvatarFallback>
                    </Avatar>
                    <span>{organization.name}</span>
                    {selectedTeam?.id === organization.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={goToCreateOrganization}>
              <span>Tạo tổ chức mới</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}









