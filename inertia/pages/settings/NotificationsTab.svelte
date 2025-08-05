<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Checkbox from '@/components/ui/checkbox.svelte'
  import type { NotificationsTabProps } from './types'

  const { form, onSubmit, processing }: NotificationsTabProps = $props()
</script>

<Card>
  <CardHeader>
    <CardTitle>Thông báo</CardTitle>
    <CardDescription>
      Quản lý cài đặt thông báo và email
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form onsubmit={onSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label>Tùy chọn thông báo</Label>
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="email-notifications"
              checked={form.data.emailNotifications}
              onCheckedChange={(checked) =>
                { form.setData('emailNotifications', checked === true); }
              }
            />
            <Label for="email-notifications">Thông báo qua email</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox
              id="push-notifications"
              checked={form.data.pushNotifications}
              onCheckedChange={(checked) =>
                { form.setData('pushNotifications', checked === true); }
              }
            />
            <Label for="push-notifications">Thông báo đẩy</Label>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={processing}>
        {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  </CardContent>
</Card>
