<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Input from '@/components/ui/input.svelte'
  import type { AccountTabProps } from './types'

  const { form, onSubmit, processing }: AccountTabProps = $props()

  function handleEmailInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    form.setData('email', target.value)
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Thông tin tài khoản</CardTitle>
    <CardDescription>
      Cập nhật email tài khoản của bạn. Ứng dụng sử dụng OAuth (Google/GitHub) để đăng nhập, không cần mật khẩu.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form onsubmit={onSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          value={form.data.email}
          oninput={handleEmailInput}
        />
        {#if form.errors.email}
          <p class="text-sm text-destructive">{form.errors.email}</p>
        {/if}
      </div>
      <Button type="submit" disabled={processing}>
        {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  </CardContent>
</Card>
