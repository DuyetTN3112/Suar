import { useState, useEffect } from 'react'
import { usePage } from '@inertiajs/react'

interface TranslationProps {
  locale?: string
  translations?: Record<string, unknown>
}

// Danh sách các module ngôn ngữ
const LANGUAGE_MODULES = [
  'common',
  'auth',
  'organization',
  'user',
  'task',
  'conversation',
  'settings',
]

// Cache để lưu trữ các dịch đã tải
type TranslationsCache = {
  [locale: string]: {
    [module: string]: Record<string, unknown>
  }
}

const translationsCache: TranslationsCache = {}

export default function useTranslation() {
  const { locale = 'en', translations = {} } = usePage().props as TranslationProps
  const [loadedModules, setLoadedModules] = useState<string[]>([])

  // Tải tất cả các module ngôn ngữ khi hook được khởi tạo
  useEffect(() => {
    // Kiểm tra xem đã tải các module chưa
    const notLoadedModules = LANGUAGE_MODULES.filter((module) => !loadedModules.includes(module))

    // Nếu còn module chưa tải, tiến hành tải
    if (notLoadedModules.length > 0) {
      Promise.all(notLoadedModules.map((module) => loadTranslationModule(locale, module))).then(
        () => {
          // Đánh dấu tất cả module đã tải
          setLoadedModules((prev) => [...prev, ...notLoadedModules])
        }
      )
    }
  }, [locale])

  // Hàm để tải một module ngôn ngữ
  const loadTranslationModule = async (currentLocale: string, module: string): Promise<void> => {
    // Kiểm tra cache trước
    if (translationsCache[currentLocale]?.[module]) {
      return
    }

    try {
      // Tải file ngôn ngữ theo module
      const response = await fetch(`/lang/${currentLocale}/${module}.json`)
      if (!response.ok) {
        console.error(`Error loading translation module ${module} for locale ${currentLocale}`)
        return
      }

      const moduleTranslations = await response.json()

      // Lưu vào cache
      if (!translationsCache[currentLocale]) {
        translationsCache[currentLocale] = {}
      }

      translationsCache[currentLocale][module] = moduleTranslations
    } catch (error) {
      console.error(`Error loading translation module ${module}:`, error)
    }
  }

  // Hàm dịch với hỗ trợ các module
  function t(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
    let result: string | Record<string, unknown> | undefined

    // Ưu tiên dịch từ props (nếu có)
    if (translations) {
      result = getNestedValue(key, translations)
    }
    // Nếu không có trong props, tìm trong cache các module đã tải
    if (!result && translationsCache[locale]) {
      // Duyệt qua các module đã tải để tìm bản dịch
      for (const module of LANGUAGE_MODULES) {
        if (translationsCache[locale][module]) {
          result = getNestedValue(key, translationsCache[locale][module])
          if (result) break
        }
      }
    }

    // Nếu không tìm thấy, dùng fallback hoặc key
    if (!result) {
      result = fallback || key
    }

    // Thay thế các tham số nếu có
    if (typeof result === 'string' && Object.keys(params).length > 0) {
      result = Object.entries(params).reduce(
        (str, [paramKey, value]) => str.replace(new RegExp(`{${paramKey}}`, 'g'), String(value)),
        result
      )
    }

    return String(result)
  }

  // Hàm lấy giá trị trong object theo đường dẫn key (vd: "user.name")
  function getNestedValue(path: string, obj: Record<string, unknown>): unknown {
    const keys = path.split('.')
    let current = obj

    for (const keyName of keys) {
      if (current === undefined || current === null) {
        return undefined
      }
      current = current[keyName]
    }

    return current
  }

  return { t, locale }
}
