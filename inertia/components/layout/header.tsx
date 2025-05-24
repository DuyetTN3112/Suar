import React from 'react'
import { Link } from '@inertiajs/react'
import { SidebarTrigger } from '@/components/ui/sidebar/index'
import { ModeToggle } from '@/components/ui/mode_toggle'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Header = ({
  className,
  fixed,
  children,
  ...props
}: HeaderProps) => {
  const [offset, setOffset] = React.useState(0)

  React.useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'bg-background flex h-16 items-center gap-3 p-4 sm:gap-4',
        fixed && 'header-fixed peer/header fixed z-50 w-[inherit] rounded-md',
        offset > 10 && fixed ? 'shadow-sm' : 'shadow-none',
        className
      )}
      {...props}
    >
      <SidebarTrigger className='scale-125 sm:scale-100' />
      <Separator orientation='vertical' className='h-6' />
      <div className="flex items-center gap-2 lg:gap-4">
        <Link href="/" className="flex items-center gap-2 lg:gap-3">
          <span className="flex h-6 w-6 rounded-md bg-primary text-primary-foreground items-center justify-center text-xs font-bold">S</span>
          <span className="text-lg font-semibold">ShadcnAdmin</span>
        </Link>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  )
}

Header.displayName = 'Header'
