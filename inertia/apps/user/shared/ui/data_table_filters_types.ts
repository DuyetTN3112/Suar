export type FilterOption = {
  label: string
  value: string
  hasAvatar?: boolean
  avatarUrl?: string | null
}

export type FilterConfig = {
  key: string
  type: 'search' | 'select' | 'multi_select' | 'tabs' | 'date_range' | 'number_range'
  label?: string
  placeholder?: string
  options?: FilterOption[]
  defaultValue?: string | [string, string]
}

export type FilterValue = string | string[] | [string, string] | null | undefined
