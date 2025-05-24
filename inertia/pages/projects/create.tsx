import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectCreateProps } from './types'
import useTranslation from '@/hooks/use_translation'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function ProjectCreate({ organizations, statuses, auth }: ProjectCreateProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: '',
    status_id: '',
    start_date: '',
    end_date: '',
    manager_id: auth.user.id.toString(), // Mặc định người tạo là quản lý
  })
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Xóa lỗi khi người dùng sửa trường đó
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // Xóa lỗi khi người dùng sửa trường đó
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    setFormData(prev => ({
      ...prev,
      start_date: date ? format(date, 'yyyy-MM-dd') : ''
    }))

    // Xóa lỗi khi người dùng sửa trường đó
    if (errors['start_date']) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['start_date']
        return newErrors
      })
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    setFormData(prev => ({
      ...prev,
      end_date: date ? format(date, 'yyyy-MM-dd') : ''
    }))

    // Xóa lỗi khi người dùng sửa trường đó
    if (errors['end_date']) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['end_date']
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Kiểm tra dữ liệu
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validator.required', {}, 'Trường này là bắt buộc')
    }

    if (!formData.organization_id) {
      newErrors.organization_id = t('validator.required', {}, 'Trường này là bắt buộc')
    }

    if (!formData.status_id) {
      newErrors.status_id = t('validator.required', {}, 'Trường này là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Gửi dữ liệu
    router.post('/projects', formData)
  }

  return (
    <AppLayout title={t('project.create_project', {}, 'Tạo dự án mới')}>
      <Head title={t('project.create_project', {}, 'Tạo dự án mới')} />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('project.create_project', {}, 'Tạo dự án mới')}</h1>

          <Button
            onClick={() => router.visit('/projects')}
            variant="outline"
          >
            {t('common.cancel', {}, 'Hủy')}
          </Button>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('project.name', {}, 'Tên dự án')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {t('project.description', {}, 'Mô tả')}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_id">
                  {t('project.organization', {}, 'Tổ chức')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(value) => handleSelectChange('organization_id', value)}
                >
                  <SelectTrigger className={errors.organization_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('project.select_organization', {}, 'Chọn tổ chức')} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organization_id && (
                  <p className="text-sm text-red-500">{errors.organization_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_id">
                  {t('project.status', {}, 'Trạng thái')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status_id}
                  onValueChange={(value) => handleSelectChange('status_id', value)}
                >
                  <SelectTrigger className={errors.status_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('project.select_status', {}, 'Chọn trạng thái')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status_id && (
                  <p className="text-sm text-red-500">{errors.status_id}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    {t('project.start_date', {}, 'Ngày bắt đầu')}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, 'PPP', { locale: vi })
                        ) : (
                          <span>{t('common.pick_date', {}, 'Chọn ngày')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={handleStartDateChange}
                        // Loại bỏ initialFocus vì không tồn tại trong CalendarProps
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">
                    {t('project.end_date', {}, 'Ngày kết thúc')}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, 'PPP', { locale: vi })
                        ) : (
                          <span>{t('common.pick_date', {}, 'Chọn ngày')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={handleEndDateChange}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit('/projects')}
              >
                {t('common.cancel', {}, 'Hủy')}
              </Button>
              <Button type="submit">
                {t('common.create', {}, 'Tạo')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  )
}
