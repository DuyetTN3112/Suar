<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import type { AppearanceTabProps } from './types'

  const { form, onSubmit, processing }: AppearanceTabProps = $props()
</script>

<Card>
  <CardHeader>
    <CardTitle>Giao diện</CardTitle>
    <CardDescription>
      Tùy chỉnh giao diện ứng dụng theo ý thích của bạn
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form onsubmit={onSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label>Chủ đề</Label>
        <div class="flex space-x-4">
          <Button
            type="button"
            variant={form.data.theme === 'light' ? 'default' : 'outline'}
            onclick={() => { form.setData('theme', 'light'); }}
          >
            Sáng
          </Button>
          <Button
            type="button"
            variant={form.data.theme === 'dark' ? 'default' : 'outline'}
            onclick={() => { form.setData('theme', 'dark'); }}
          >
            Tối
          </Button>
          <Button
            type="button"
            variant={form.data.theme === 'system' ? 'default' : 'outline'}
            onclick={() => { form.setData('theme', 'system'); }}
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
