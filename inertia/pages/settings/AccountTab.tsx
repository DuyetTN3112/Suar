
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
          Cập nhật email tài khoản của bạn. Ứng dụng sử dụng OAuth (Google/GitHub) để đăng nhập, không cần mật khẩu.
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
          <Button type="submit" disabled={processing}>
            {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
