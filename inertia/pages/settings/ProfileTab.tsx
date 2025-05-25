import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ProfileTabProps } from './types'

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
          <div className="space-y-2">
            <Label htmlFor="username">Tên người dùng</Label>
            <Input
              id="username"
              value={form.data.username}
              onChange={e => form.setData('username', e.target.value)}
            />
            {form.errors.username && (
              <p className="text-sm text-destructive">{form.errors.username}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.data.email}
              onChange={e => form.setData('email', e.target.value)}
            />
            {form.errors.email && (
              <p className="text-sm text-destructive">{form.errors.email}</p>
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
