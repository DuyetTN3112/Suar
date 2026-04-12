export interface UserSettings {
  id?: string
  userId?: string
  theme?: 'light' | 'dark' | 'system'
  language?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  email: string
  username: string
}

export interface SettingsProps {
  user: User
  settings: UserSettings
}

export interface ProfileFormData {
  username: string
  email: string
}

export interface AccountFormData {
  email: string
}

export interface AppearanceFormData {
  theme: 'light' | 'dark' | 'system'
}

export interface NotificationsFormData {
  emailNotifications: boolean
  pushNotifications: boolean
}

export interface FormProps {
  onSubmit: (e: SubmitEvent) => void
  processing: boolean
}

export type ProfileTabProps = FormProps & {
  form: {
    data: ProfileFormData
    setData: (key: string, value: unknown) => void
    errors: Record<string, string | undefined>
    processing: boolean
  }
}

export type AccountTabProps = FormProps & {
  form: {
    data: AccountFormData
    setData: (key: string, value: unknown) => void
    errors: Record<string, string | undefined>
    processing: boolean
  }
}

export type AppearanceTabProps = FormProps & {
  form: {
    data: AppearanceFormData
    setData: (key: string, value: unknown) => void
    errors: Record<string, string | undefined>
    processing: boolean
  }
}

export type NotificationsTabProps = FormProps & {
  form: {
    data: NotificationsFormData
    setData: (key: string, value: unknown) => void
    errors: Record<string, string | undefined>
    processing: boolean
  }
}
