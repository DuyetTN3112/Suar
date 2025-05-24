import React from 'react'

export type UserSettings = {
  id?: number
  userId?: number
  theme?: 'light' | 'dark' | 'system'
  language?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  created_at?: string
  updated_at?: string
}

export type User = {
  id: number
  email: string
  username: string
}

export type SettingsProps = {
  user: User
  settings: UserSettings
}

export type ProfileFormData = {
  username: string
  email: string
}

export type AccountFormData = {
  email: string
  current_password: string
  password: string
  password_confirmation: string
}

export type AppearanceFormData = {
  theme: 'light' | 'dark' | 'system'
}

export type NotificationsFormData = {
  emailNotifications: boolean
  pushNotifications: boolean
}

export type FormProps = {
  onSubmit: (e: React.FormEvent) => void
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
