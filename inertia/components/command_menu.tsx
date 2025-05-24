
import { useEffect, useCallback } from 'react'
import { router } from '@inertiajs/react'
import { DialogProps } from '@radix-ui/react-dialog'
import { ArrowRightIcon } from 'lucide-react'
import { useTheme } from '@/hooks/theme'
import { useSearch } from '@/context/search_context'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll_area'
import { mainNavigation } from '@/components/navigation'

const sidebarData = {
  navGroups: mainNavigation,
}

export function CommandMenu({ ...props }: DialogProps) {
  const { setTheme } = useTheme()
  const { isOpen, setIsOpen, query, setQuery } = useSearch()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, setIsOpen])

  const runCommand = useCallback((command: () => unknown) => {
    setIsOpen(false)
    command()
  }, [setIsOpen])

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen} {...props}>
      <CommandInput
        placeholder="Nhập lệnh hoặc tìm kiếm..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <ScrollArea className="h-72 pr-1">
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          {sidebarData.navGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() =>
                          router.visit(navItem.url, {
                            preserveState: true,
                            preserveScroll: true
                          })
                        )
                      }}
                    >
                      <div className="mr-2 flex h-4 w-4 items-center justify-center">
                        <ArrowRightIcon className="text-muted-foreground/80 size-2" />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  )

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${subItem.url}-${i}`}
                    value={subItem.title}
                    onSelect={() => {
                      runCommand(() =>
                        router.visit(subItem.url, {
                          preserveState: true,
                          preserveScroll: true
                        })
                      )
                    }}
                  >
                    <div className="mr-2 flex h-4 w-4 items-center justify-center">
                      <ArrowRightIcon className="text-muted-foreground/80 size-2" />
                    </div>
                    {subItem.title}
                  </CommandItem>
                ))
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Giao diện">
            <CommandItem
              onSelect={() => runCommand(() => setTheme('light'))}
              value="Sáng"
            >
              <div className="mr-2 flex h-4 w-4 items-center justify-center">
                <ArrowRightIcon className="text-muted-foreground/80 size-2" />
              </div>
              Chế độ sáng
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setTheme('dark'))}
              value="Tối"
            >
              <div className="mr-2 flex h-4 w-4 items-center justify-center">
                <ArrowRightIcon className="text-muted-foreground/80 size-2" />
              </div>
              Chế độ tối
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setTheme('system'))}
              value="Hệ thống"
            >
              <div className="mr-2 flex h-4 w-4 items-center justify-center">
                <ArrowRightIcon className="text-muted-foreground/80 size-2" />
              </div>
              Theo hệ thống
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
