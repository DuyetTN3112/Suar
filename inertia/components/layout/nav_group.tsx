import React from 'react'
import { ReactNode } from 'react'
import { Link, router } from '@inertiajs/react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar/index'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown_menu'
import { NavCollapsible, NavItem, NavLink, type NavGroup } from './types'
import useTranslation from '@/hooks/use_translation'

// Optimize navigation to maintain SPA behavior and prevent full page reloads
const handleNavigation = (url: string, callback?: () => void) => {
  if (!url) return
  
  // Kiểm tra nếu đây là URL của trang chi tiết hội thoại
  if (url.match(/^\/conversations\/[^\/]+$/)) {
    // Sử dụng router.get cho trang chi tiết hội thoại để đảm bảo tải dữ liệu đầy đủ
    router.get(url)
  } else {
    // Giữ nguyên router.visit cho các trang khác để duy trì SPA
    router.visit(url, {
      preserveScroll: true,
      preserveState: true,
    })
  }
  
  // Execute callback after navigation (e.g. close mobile sidebar)
  if (callback) callback()
}

export function NavGroup({ title, titleKey, items }: NavGroup) {
  const { state } = useSidebar()
  const { t } = useTranslation()
  const currentUrl = window.location.href
  
  // Sử dụng khóa dịch nếu có, ngược lại sử dụng tiêu đề mặc định
  const translatedTitle = titleKey ? t(titleKey, {}, title) : title
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{translatedTitle}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`

          if (!item.items)
            return <SidebarMenuLink key={key} item={item} href={currentUrl} />

          if (state === 'collapsed')
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={currentUrl} />
            )

          return <SidebarMenuCollapsible key={key} item={item} href={currentUrl} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

const NavBadge = ({ children }: { children: ReactNode }) => (
  <Badge
    variant='secondary'
    className='ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground'
  >
    {children}
  </Badge>
)

const SidebarMenuLink = ({ item, href }: { item: NavLink; href: string }) => {
  const { setOpenMobile } = useSidebar()
  const { t } = useTranslation()
  
  // Sử dụng khóa dịch nếu có, ngược lại sử dụng tiêu đề mặc định
  const translatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={translatedTitle}
      >
        <Link 
          href={item.url} 
          onClick={(e) => {
            e.preventDefault()
            handleNavigation(item.url, () => setOpenMobile(false))
          }}
        >
          {item.icon && <item.icon />}
          <span>{translatedTitle}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const SidebarMenuCollapsible = ({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) => {
  const { setOpenMobile } = useSidebar()
  const { t } = useTranslation()
  
  // Sử dụng khóa dịch nếu có, ngược lại sử dụng tiêu đề mặc định
  const translatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title
  
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={translatedTitle}>
            {item.icon && <item.icon />}
            <span>{translatedTitle}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              // Dịch tiêu đề mục con
              const translatedSubTitle = subItem.titleKey 
                ? t(subItem.titleKey, {}, subItem.title) 
                : subItem.title;
              
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={checkIsActive(href, subItem)}
                  >
                    <Link 
                      href={subItem.url} 
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigation(subItem.url, () => setOpenMobile(false))
                      }}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span>{translatedSubTitle}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

const SidebarMenuCollapsedDropdown = ({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) => {
  const { t } = useTranslation()
  
  // Sử dụng khóa dịch nếu có, ngược lại sử dụng tiêu đề mặc định
  const translatedTitle = item.titleKey ? t(item.titleKey, {}, item.title) : item.title
  
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={translatedTitle}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{translatedTitle}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {translatedTitle} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => {
            // Dịch tiêu đề mục con
            const translatedSubTitle = sub.titleKey 
              ? t(sub.titleKey, {}, sub.title) 
              : sub.title;
            
            return (
              <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                <Link
                  href={sub.url}
                  className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigation(sub.url)
                  }}
                >
                  {sub.icon && <sub.icon />}
                  <span className='max-w-52 text-wrap'>{translatedSubTitle}</span>
                  {sub.badge && (
                    <span className='ml-auto text-xs'>{sub.badge}</span>
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url || // /endpint?search=param
    href.split('?')[0] === item.url || // endpoint
    !!item?.items?.filter((i) => i.url === href).length || // if child nav is active
    (mainNav &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}
