import { useTheme as useThemeContext } from '@/context/theme_context'

export const useTheme = () => {
  return useThemeContext()
}

export default useTheme 