import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AppearanceTabProps } from './types'

export function AppearanceTab({ form, onSubmit, processing }: AppearanceTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Giao diện</CardTitle>
        <CardDescription>
          Tùy chỉnh giao diện ứng dụng theo ý thích của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Chủ đề</Label>
            <div className="flex space-x-4">
              <Button 
                type="button"
                variant={form.data.theme === 'light' ? 'default' : 'outline'}
                onClick={() => form.setData('theme', 'light')}
              >
                Sáng
              </Button>
              <Button 
                type="button"
                variant={form.data.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => form.setData('theme', 'dark')}
              >
                Tối
              </Button>
              <Button 
                type="button"
                variant={form.data.theme === 'system' ? 'default' : 'outline'}
                onClick={() => form.setData('theme', 'system')}
              >
                Hệ thống
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={processing}>
            {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 