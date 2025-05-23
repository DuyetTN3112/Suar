# Hướng dẫn Quốc tế hóa (i18n) cho ShadcnAdmin

Tài liệu này cung cấp hướng dẫn về cách áp dụng quốc tế hóa (i18n) trong toàn bộ ứng dụng ShadcnAdmin.

## Cấu trúc Tệp Dịch

Tất cả các bản dịch được lưu trữ trong thư mục `resources/lang/{locale}` với cấu trúc sau:

- `resources/lang/en/` - Bản dịch tiếng Anh
- `resources/lang/vi/` - Bản dịch tiếng Việt

Mỗi thư mục chứa các tệp dịch định dạng JSON:

- `messages.json` - Văn bản giao diện người dùng chung
- `validator.json` - Thông báo xác thực

## Sử dụng Dịch trong React

### 1. Hook useTranslation

Sử dụng hook `useTranslation` để truy cập các bản dịch trong các component React:

```tsx
import useTranslation from '@/hooks/useTranslation'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('messages.greeting')}</h1>
      <p>{t('messages.welcome')}</p>
    </div>
  )
}
```

### 2. Dịch với Tham số

Bạn có thể truyền tham số vào bản dịch:

```tsx
const { t } = useTranslation()

// Bản dịch: "Hello {name}"
t('messages.greeting_with_name', { name: 'John' })
```

### 3. Giá trị Fallback

Luôn cung cấp giá trị fallback cho các khóa dịch chưa được định nghĩa:

```tsx
t('messages.new_key', {}, 'Giá trị mặc định')
```

## Áp dụng i18n cho từng phần của Ứng dụng

### 1. Nhiệm vụ (Tasks)

Trong các trang và component liên quan đến nhiệm vụ, sử dụng khóa dịch có tiền tố `task.`:

```tsx
// Ví dụ: Trong trang danh sách nhiệm vụ
<h1>{t('task.task_list')}</h1>
<Button>{t('task.add_task')}</Button>

// Trong form nhiệm vụ
<Label>{t('task.title')}</Label>
<Label>{t('task.due_date')}</Label>
```

### 2. Tổ chức (Organizations)

Trong các trang và component liên quan đến tổ chức, sử dụng khóa dịch có tiền tố `organization.`:

```tsx
// Ví dụ: Trong trang danh sách tổ chức
<h1>{t('organization.organization_list')}</h1>

// Trong chi tiết tổ chức
<h2>{t('organization.members')}</h2>
```

### 3. Người dùng (Users)

Trong các trang và component liên quan đến người dùng, sử dụng khóa dịch có tiền tố `user.`:

```tsx
// Ví dụ: Trong trang danh sách người dùng
<h1>{t('user.user_list')}</h1>
```

### 4. Trò chuyện (Conversations)

Trong các trang và component liên quan đến trò chuyện, sử dụng khóa dịch có tiền tố `conversation.`:

```tsx
// Ví dụ: Trong trang trò chuyện
<h1>{t('conversation.messages')}</h1>
<Button>{t('conversation.send_message')}</Button>
```

### 5. Cài đặt (Settings)

Trong các trang và component liên quan đến cài đặt, sử dụng khóa dịch có tiền tố `settings.`:

```tsx
// Ví dụ: Trong trang cài đặt
<h1>{t('settings.profile')}</h1>
<h2>{t('settings.security')}</h2>
```

### 6. Khóa Chung (Common)

Đối với các thành phần chung, sử dụng khóa dịch có tiền tố `common.`:

```tsx
<Button>{t('common.save')}</Button>
<Button>{t('common.cancel')}</Button>
```

## Chuyển đổi Ngôn ngữ

Component `LanguageSwitcher` đã được thêm vào thanh điều hướng để cho phép người dùng chuyển đổi giữa các ngôn ngữ. Khi họ chọn một ngôn ngữ, trang sẽ được tải lại với tham số `locale` mới.

## Thêm Ngôn ngữ Mới

Để thêm một ngôn ngữ mới:

1. Tạo thư mục mới trong `resources/lang/` với mã ngôn ngữ tương ứng (ví dụ: `fr` cho tiếng Pháp)
2. Sao chép tất cả các tệp JSON từ một ngôn ngữ hiện có và dịch các giá trị
3. Thêm ngôn ngữ mới vào mảng `supportedLocales` trong `config/i18n.ts`

## Quy trình Làm việc

Khi thêm tính năng mới:

1. Luôn sử dụng hook `useTranslation` thay vì chuỗi cố định
2. Thêm khóa dịch mới vào cả hai tệp ngôn ngữ (en và vi)
3. Tổ chức khóa dịch theo phần của ứng dụng (task, organization, user, ...)
4. Luôn cung cấp giá trị fallback cho các khóa dịch

## Các Thành phần Cần i18n

Các thành phần sau cần được áp dụng i18n:

- [ ] Thành phần UI chung (buttons, alerts, etc.)
- [ ] Trang và component nhiệm vụ
- [ ] Trang và component tổ chức
- [ ] Trang và component người dùng
- [ ] Trang và component trò chuyện
- [ ] Trang và component cài đặt
- [ ] Trang lỗi
- [ ] Thông báo xác thực 