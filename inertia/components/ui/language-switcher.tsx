import React from 'react'
import { usePage, router } from '@inertiajs/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './dropdown-menu'
import { Button } from './button'
import { GlobeIcon } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

interface PageProps {
  locale: string
  supportedLocales: string[]
  translations?: any
  [key: string]: any
}

export function LanguageSwitcher() {
  const props = usePage().props as unknown as PageProps
  const { locale, supportedLocales, translations } = props
  const { t } = useTranslation()

  // Debug log chi tiết

  // Kiểm tra translations có đầy đủ không
  if (translations) {

    // Kiểm tra namespace messages
    if (translations.messages) {
      // Kiểm tra các namespace con trong messages

      // Kiểm tra các key trong user namespace
      if (translations.messages.user) {

      } else {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[LanguageSwitcher] Missing user namespace in messages')
        }
      }

      // Kiểm tra các key trong common namespace
      if (translations.messages.common) {

      } else {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[LanguageSwitcher] Missing common namespace in messages')
        }
      }
    } else {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LanguageSwitcher] Missing messages namespace in translations')
      }
    }
  }

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      en: 'English',
      vi: 'Tiếng Việt'
    }
    return languages[code] || code
  }

  const switchLanguage = (newLocale: string) => {

    // Chuyển đổi ngôn ngữ bằng cách tải lại trang với tham số locale mới
    const url = new URL(window.location.href)

    // Xóa tham số locale cũ trước khi thêm tham số mới
    url.searchParams.delete('locale')

    // Thêm tham số locale mới
    url.searchParams.set('locale', newLocale)

    const newUrl = url.toString()

    // Sử dụng window.location.href để tải lại trang hoàn toàn thay vì router.visit
    // Điều này đảm bảo middleware phát hiện ngôn ngữ sẽ được kích hoạt đầy đủ
    window.location.href = newUrl

    // Không sử dụng router.visit vì có thể không tải lại đầy đủ dữ liệu dịch
    // router.visit(newUrl, {
    //   preserveScroll: true,
    //   preserveState: false,
    //   replace: true,
    // })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <GlobeIcon className="h-4 w-4" />
          <span className="sr-only">{t('settings.language_switcher', {}, 'Chuyển đổi ngôn ngữ')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {supportedLocales?.map((code) => (
            <DropdownMenuItem
              key={code}
              onClick={() => switchLanguage(code)}
              className={locale === code ? 'bg-accent' : ''}
            >
              {getLanguageName(code)}
              {locale === code && <span className="ml-2 text-xs">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
