import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProfileTabProps } from './types'

export function ProfileTab({ form, onSubmit, processing }: ProfileTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin hồ sơ</CardTitle>
        <CardDescription>
          Cập nhật thông tin cá nhân và hồ sơ công khai
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Họ</Label>
              <Input 
                id="first_name" 
                value={form.data.first_name}
                onChange={e => form.setData('first_name', e.target.value)}
              />
              {form.errors.first_name && (
                <p className="text-sm text-destructive">{form.errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Tên</Label>
              <Input 
                id="last_name" 
                value={form.data.last_name}
                onChange={e => form.setData('last_name', e.target.value)}
              />
              {form.errors.last_name && (
                <p className="text-sm text-destructive">{form.errors.last_name}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input 
              id="phone" 
              value={form.data.phone_number}
              onChange={e => form.setData('phone_number', e.target.value)}
            />
            {form.errors.phone_number && (
              <p className="text-sm text-destructive">{form.errors.phone_number}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea 
              id="address" 
              value={form.data.address}
              onChange={e => form.setData('address', e.target.value)}
            />
            {form.errors.address && (
              <p className="text-sm text-destructive">{form.errors.address}</p>
            )}
          </div>
          <Button type="submit" disabled={processing}>
            {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 