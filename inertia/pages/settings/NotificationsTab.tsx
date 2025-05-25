
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { NotificationsTabProps } from './types'

export function NotificationsTab({ form, onSubmit, processing }: NotificationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông báo</CardTitle>
        <CardDescription>
          Quản lý cài đặt thông báo và email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tùy chọn thông báo</Label>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-notifications"
                  checked={form.data.emailNotifications}
                  onCheckedChange={(checked) =>
                    form.setData('emailNotifications', checked === true)
                  }
                />
                <Label htmlFor="email-notifications">Thông báo qua email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push-notifications"
                  checked={form.data.pushNotifications}
                  onCheckedChange={(checked) =>
                    form.setData('pushNotifications', checked === true)
                  }
                />
                <Label htmlFor="push-notifications">Thông báo đẩy</Label>
              </div>
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
