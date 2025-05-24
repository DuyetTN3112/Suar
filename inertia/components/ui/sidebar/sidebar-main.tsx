import * as React from 'react'
import { cn } from '@/lib/utils'
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, Sheet } from '@/components/ui/sheet'
import {
  useSidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_ICON,
} from './sidebar-context'

export interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'inset'
  collapsible?: 'offcanvas' | 'collapse' | 'none'
}

export function Sidebar({
  side = 'left',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === 'none') {
    return (
      <div
        data-slot='sidebar'
        className={cn(
          'bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar='sidebar'
          data-slot='sidebar'
          data-mobile='true'
          className='bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden'
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className='flex h-full w-full flex-col'>{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar with explicit width setting
  const sidebarWidth = state === 'expanded' ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON

  return (
    <div
      data-sidebar='sidebar'
      data-slot='sidebar'
      data-state={state}
      className={cn(
        'bg-sidebar text-sidebar-foreground h-full transition-[width] duration-300 ease-in-out',
        className
      )}
      style={
        {
          '--sidebar-width': sidebarWidth,
          width: sidebarWidth,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}

export interface SidebarRailProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarRail({ className, ...props }: SidebarRailProps) {
  return (
    <div
      data-slot='sidebar-rail'
      className={cn(
        'border-sidebar-muted bg-sidebar h-full w-mini border-r border-solid z-20 flex-none',
        className
      )}
      {...props}
    />
  )
}

export interface SidebarInsetProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <div
      data-slot='sidebar-inset'
      className={cn(
        'bg-sidebar-inset h-full w-full overflow-auto border-0 border-solid z-10',
        className
      )}
      {...props}
    />
  )
}

export interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type='button'
      data-slot='sidebar-trigger'
      aria-label='Toggle sidebar'
      className={cn('hidden p-2 text-muted-foreground hover:text-foreground', className)}
      onClick={toggleSidebar}
      {...props}
    />
  )
}
