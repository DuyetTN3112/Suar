
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { AccountTabProps } from './types'

export function AccountTab({ form, onSubmit, processing }: AccountTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin tài khoản</CardTitle>
        <CardDescription>
          Cập nhật thông tin đăng nhập và bảo mật tài khoản của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={form.data.email}
              onChange={e => form.setData('email', e.target.value)}
            />
            {form.errors.email && (
              <p className="text-sm text-destructive">{form.errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
            <Input
              id="current-password"
              type="password"
              value={form.data.current_password}
              onChange={e => form.setData('current_password', e.target.value)}
            />
            {form.errors.current_password && (
              <p className="text-sm text-destructive">{form.errors.current_password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input
              id="new-password"
              type="password"
              value={form.data.password}
              onChange={e => form.setData('password', e.target.value)}
            />
            {form.errors.password && (
              <p className="text-sm text-destructive">{form.errors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm-password"
              type="password"
              value={form.data.password_confirmation}
              onChange={e => form.setData('password_confirmation', e.target.value)}
            />
            {form.errors.password_confirmation && (
              <p className="text-sm text-destructive">{form.errors.password_confirmation}</p>
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
