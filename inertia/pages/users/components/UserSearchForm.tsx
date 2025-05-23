import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useTranslation from '@/hooks/use_translation'

interface UserSearchFormProps {
  search: string
  setSearch: (value: string) => void
  handleSearch: (e: React.FormEvent) => void
}

export default function UserSearchForm({ search, setSearch, handleSearch }: UserSearchFormProps) {
  const { t } = useTranslation()
  
  return (
    <form onSubmit={handleSearch} className="flex items-center gap-4">
      <Input 
        placeholder={t('user.search_users', {}, "Tìm kiếm người dùng...")}
        className="max-w-sm" 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Button variant="outline" type="submit">{t('common.search', {}, "Tìm kiếm")}</Button>
    </form>
  )
} 