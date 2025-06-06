# 🎨 SUAR Frontend — Neo-Brutalism Migration Plan

> Tài liệu chi tiết cho việc chuyển đổi toàn bộ giao diện SUAR từ style shadcn mặc định (đơn sắc, nhẹ nhàng) sang phong cách **Neo-Brutalism** — táo bạo, nổi bật, đầy cá tính.
> Ngày tạo: 2026-03-16

---

## 📋 Mục lục

1. [Neo-Brutalism là gì?](#-neo-brutalism-là-gì)
2. [Tại sao chuyển sang Neo-Brutalism?](#-tại-sao-chuyển-sang-neo-brutalism)
3. [Design System mới](#-design-system-mới)
4. [Bảng màu (Color Palette)](#-bảng-màu-color-palette)
5. [Typography](#-typography)
6. [Các đặc trưng CSS cốt lõi](#-các-đặc-trưng-css-cốt-lõi)
7. [Kế hoạch Migration từng bước](#-kế-hoạch-migration-từng-bước)
8. [Chi tiết thay đổi từng Component](#-chi-tiết-thay-đổi-từng-component)
9. [Chi tiết thay đổi từng Layout](#-chi-tiết-thay-đổi-từng-layout)
10. [Chi tiết thay đổi từng Page](#-chi-tiết-thay-đổi-từng-page)
11. [Pages cần tạo mới](#-pages-cần-tạo-mới)
12. [Dark Mode trong Neo-Brutalism](#-dark-mode-trong-neo-brutalism)
13. [Animation & Interaction](#-animation--interaction)
14. [Checklist tổng hợp](#-checklist-tổng-hợp)

---

## 🧠 Neo-Brutalism là gì?

Neo-Brutalism (hay Neobrutalism) là sự kết hợp giữa **Brutalism truyền thống** trong thiết kế web với **typography hiện đại, minh họa, và animation**. Phong cách này:

- **Từ chối** sự mềm mại, tối giản quá mức của design hiện đại thông thường
- **Ôm lấy** các yếu tố thiết kế "thô", mạnh mẽ, gây chú ý
- **Sử dụng** bảng màu rực rỡ, táo bạo, tương phản cao
- **Tham khảo**: [neobrutalism.dev](https://neobrutalism.dev), [ekmas/neobrutalism-components](https://github.com/ekmas/neobrutalism-components)

### Đặc điểm nhận dạng chính:

| Đặc điểm | Mô tả |
|-----------|--------|
| 🖤 **Viền đen dày** | Border 2-3px solid đen trên mọi element |
| 📦 **Hard shadow (offset shadow)** | Box-shadow cứng, không blur, dịch chuyển sang phải-dưới (vd: `4px 4px 0px 0px #000`) |
| 🌈 **Màu sắc rực rỡ** | Vàng tươi, hồng, xanh lam, cam, xanh lá — đối lập mạnh |
| 🔲 **Flat color** | Không gradient, không hiệu ứng glass, không blur |
| ✏️ **Typography đậm** | Font chữ đậm, to, rõ ràng — có thể dùng monospace hoặc bold sans-serif |
| 📐 **Góc vuông hoặc bo nhẹ** | Không bo tròn quá nhiều (0px hoặc max 8px) |
| 🎯 **Tương phản cao** | Text đen trên nền sáng, border đen rõ ràng |
| 🖱️ **Hover effect mạnh** | Shadow dịch chuyển, đổi màu nền, translate nhẹ khi hover |
| 🎪 **Vui nhộn, cá tính** | Cảm giác handmade, retro, sticker-like |

---

## 💡 Tại sao chuyển sang Neo-Brutalism?

### Vấn đề hiện tại:
- Giao diện **quá đơn sắc** — chỉ xám/trắng/đen, không nổi bật
- Style shadcn mặc định = **ai dùng cũng giống nhau**, thiếu bản sắc
- Không tạo được **ấn tượng thị giác** cho platform quản lý nhiệm vụ
- Frontend **chậm hơn backend rất nhiều** — cần vừa hoàn thiện vừa nâng cấp UX

### Lợi ích Neo-Brutalism cho Suar:
- ✅ **Nổi bật ngay lập tức** — khác biệt hoàn toàn so với các SaaS tool khác
- ✅ **Dễ nhận diện** — người dùng nhớ ngay giao diện
- ✅ **Phù hợp với platform quản lý task** — năng động, trẻ trung, năng lượng cao
- ✅ **Dễ triển khai** — chỉ cần thay đổi CSS variables + component styles (không cần redesign layout)
- ✅ **Tương thích shadcn** — neobrutalism.dev đã chứng minh shadcn hoàn toàn có thể neo-brutalism hóa

---

## 🎨 Design System mới

### Design Tokens

```
┌─────────────────────────────────────────────────────────────┐
│  SUAR Neo-Brutalism Design Tokens                            │
│                                                              │
│  Border:     2px solid #000 (light) / 2px solid #000 (dark) │
│  Shadow:     4px 4px 0px 0px #000                            │
│  Radius:     0px (sharp) hoặc 6px (soft-neo)                │
│  Font:       Inter (body) + Space Grotesk / DM Sans (heading)│
│  Translate:  translate(4px, 4px) on hover → translate(0,0)   │
│                                                              │
│  Primary:    #FF6B6B (Coral Red)                             │
│  Secondary:  #4ECDC4 (Teal)                                  │
│  Accent:     #FFE66D (Bright Yellow)                         │
│  Background: #FEFEFE (Off White)                             │
│  Foreground: #1A1A2E (Near Black)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Bảng màu (Color Palette)

### Light Mode

| Token | Hiện tại (shadcn) | Mới (Neo-Brutalism) | HSL | Hex |
|-------|-------------------|---------------------|-----|-----|
| `--background` | `0 0% 100%` (trắng) | `60 9% 98%` (off-white ấm) | `60 9% 98%` | `#FEFDFB` |
| `--foreground` | `222.2 84% 4.9%` (gần đen) | `240 20% 10%` (đen navy) | `240 20% 10%` | `#1A1A2E` |
| `--primary` | `222.2 47.4% 11.2%` (xanh tối) | `0 100% 71%` (coral đỏ) | `0 100% 71%` | `#FF6B6B` |
| `--primary-foreground` | `210 40% 98%` | `0 0% 100%` (trắng) | `0 0% 100%` | `#FFFFFF` |
| `--secondary` | `210 40% 96.1%` (xám nhạt) | `174 59% 55%` (teal) | `174 59% 55%` | `#4ECDC4` |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `240 20% 10%` | `240 20% 10%` | `#1A1A2E` |
| `--accent` | `210 40% 96.1%` (xám nhạt) | `50 100% 71%` (vàng tươi) | `50 100% 71%` | `#FFE66D` |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `240 20% 10%` | `240 20% 10%` | `#1A1A2E` |
| `--destructive` | `0 84.2% 60.2%` | `0 84% 60%` (giữ nguyên) | `0 84% 60%` | `#EF4444` |
| `--muted` | `210 40% 96.1%` | `45 30% 93%` (beige nhạt) | `45 30% 93%` | `#F5F0E8` |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `240 10% 45%` | `240 10% 45%` | `#6B6B80` |
| `--card` | `0 0% 100%` | `60 9% 98%` (off-white) | `60 9% 98%` | `#FEFDFB` |
| `--border` | `214.3 31.8% 91.4%` (xám) | `0 0% 0%` (đen!) | `0 0% 0%` | `#000000` |
| `--input` | `214.3 31.8% 91.4%` | `0 0% 0%` (đen!) | `0 0% 0%` | `#000000` |
| `--ring` | `222.2 84% 4.9%` | `0 100% 71%` (coral) | `0 100% 71%` | `#FF6B6B` |

### Dark Mode

| Token | Mới (Neo-Brutalism Dark) | HSL | Hex |
|-------|--------------------------|-----|-----|
| `--background` | `240 20% 8%` | `240 20% 8%` | `#121220` |
| `--foreground` | `60 9% 95%` | `60 9% 95%` | `#F5F3EF` |
| `--primary` | `0 100% 71%` (coral) | `0 100% 71%` | `#FF6B6B` |
| `--primary-foreground` | `240 20% 8%` | `240 20% 8%` | `#121220` |
| `--secondary` | `174 59% 45%` (teal đậm) | `174 59% 45%` | `#35B0A6` |
| `--accent` | `50 100% 65%` (vàng) | `50 100% 65%` | `#FFD84D` |
| `--card` | `240 18% 12%` | `240 18% 12%` | `#1A1A2E` |
| `--border` | `0 0% 80%` (xám sáng) | `0 0% 80%` | `#CCCCCC` |
| `--muted` | `240 15% 18%` | `240 15% 18%` | `#252540` |
| `--muted-foreground` | `240 10% 60%` | `240 10% 60%` | `#8E8EA0` |

### Màu bổ sung cho Neo-Brutalism (thêm mới)

Thêm vào CSS variables và Tailwind config:

| Tên | Hex | Dùng cho |
|-----|-----|----------|
| `--neo-pink` | `#FF8FAB` | Tags, badges, highlights |
| `--neo-blue` | `#89CFF0` | Links, info states |
| `--neo-green` | `#77DD77` | Success states, completed tasks |
| `--neo-orange` | `#FFB347` | Warnings, pending states |
| `--neo-purple` | `#B19CD9` | Special badges, roles |
| `--neo-lime` | `#BFFF00` | Active states, CTAs |
| `--neo-peach` | `#FFDAB9` | Secondary backgrounds |

---

## ✏️ Typography

### Font Stack thay đổi

```css
/* Hiện tại: Mặc định system font (nhạt nhẽo) */
/* Mới: Bold, hiện đại, cá tính */

/* Headings: Space Grotesk hoặc DM Sans */
--font-heading: 'Space Grotesk', 'DM Sans', system-ui, sans-serif;

/* Body: Inter (giữ nguyên, dễ đọc) */
--font-body: 'Inter', system-ui, sans-serif;

/* Monospace: JetBrains Mono (cho code, badges đặc biệt) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Quy tắc Typography

| Element | Hiện tại | Neo-Brutalism |
|---------|----------|---------------|
| H1 | `text-2xl font-bold` | `text-4xl font-black tracking-tight uppercase` |
| H2 | `text-xl font-semibold` | `text-2xl font-extrabold tracking-tight` |
| H3 | `text-lg font-medium` | `text-xl font-bold` |
| Body | `text-sm` | `text-base font-medium` |
| Caption | `text-xs text-muted` | `text-sm font-semibold text-muted-foreground` |
| Badge text | `text-xs` | `text-xs font-bold uppercase tracking-wider` |

---

## 🔧 Các đặc trưng CSS cốt lõi

### 1. Border (Viền đen dày)

```css
/* Utility class mới */
.neo-border {
  border: 2px solid #000;
}

/* Dark mode */
.dark .neo-border {
  border-color: #CCC;
}
```

**Áp dụng cho**: Card, Button, Input, Select, Badge, Dialog, Popover, Sheet, Sidebar

### 2. Hard Shadow (Bóng cứng)

```css
/* Shadow không blur, dịch phải-dưới */
.neo-shadow {
  box-shadow: 4px 4px 0px 0px #000;
}

.neo-shadow-sm {
  box-shadow: 2px 2px 0px 0px #000;
}

.neo-shadow-lg {
  box-shadow: 6px 6px 0px 0px #000;
}

/* Dark mode */
.dark .neo-shadow {
  box-shadow: 4px 4px 0px 0px rgba(255,255,255,0.2);
}
```

**Áp dụng cho**: Card, Button, Dialog, Sheet, Toast, Popover

### 3. Hover Effect

```css
/* Khi hover: shadow biến mất, element dịch chuyển vào vị trí shadow */
.neo-hover {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.neo-hover:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px #000; /* shadow nhỏ lại */
}

.neo-hover:active {
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0px 0px #000; /* shadow biến mất */
}
```

**Áp dụng cho**: Button, Card (clickable), Link card, Sidebar item

### 4. Border Radius

```css
/* Neo-brutalism thường dùng góc vuông hoặc bo rất nhẹ */
:root {
  --radius: 6px; /* Giảm từ 0.5rem (8px) xuống 6px */
}

/* Hoặc hoàn toàn vuông cho một số element */
.neo-sharp {
  border-radius: 0 !important;
}
```

### 5. Tailwind Config — Thêm utilities

```typescript
// tailwind.config.ts - thêm vào extend
extend: {
  boxShadow: {
    'neo': '4px 4px 0px 0px #000',
    'neo-sm': '2px 2px 0px 0px #000',
    'neo-lg': '6px 6px 0px 0px #000',
    'neo-hover': '2px 2px 0px 0px #000',
    'neo-active': '0px 0px 0px 0px #000',
    // Colored shadows
    'neo-primary': '4px 4px 0px 0px hsl(var(--primary))',
    'neo-secondary': '4px 4px 0px 0px hsl(var(--secondary))',
    'neo-accent': '4px 4px 0px 0px hsl(var(--accent))',
  },
  borderWidth: {
    'neo': '2px',
  },
  translate: {
    'neo': '4px',
    'neo-sm': '2px',
  },
  colors: {
    neo: {
      pink: '#FF8FAB',
      blue: '#89CFF0',
      green: '#77DD77',
      orange: '#FFB347',
      purple: '#B19CD9',
      lime: '#BFFF00',
      peach: '#FFDAB9',
    }
  }
}
```

---

## 📋 Kế hoạch Migration từng bước

### Phase 0: Chuẩn bị (Foundation) ⬜

| # | Task | File(s) | Mô tả |
|---|------|---------|--------|
| 0.1 | Cập nhật CSS variables | `inertia/css/app.css` | Thay toàn bộ color palette light + dark |
| 0.2 | Cập nhật Tailwind config | `tailwind.config.ts` | Thêm neo-brutalism shadows, colors, utilities |
| 0.3 | Thêm font | `inertia/css/app.css` + `inertia/app.ts` | Import Space Grotesk từ Google Fonts |
| 0.4 | Tạo neo-brutalism CSS utilities | `inertia/css/app.css` | `.neo-border`, `.neo-shadow`, `.neo-hover` classes |

### Phase 1: Base Components (UI Kit) ⬜

Thay đổi 125 UI components trong `inertia/components/ui/`. Ưu tiên components dùng nhiều nhất:

| # | Component | File | Thay đổi chính |
|---|-----------|------|----------------|
| 1.1 | **Button** | `ui/button.svelte` | Border đen, hard shadow, hover translate, màu nền rực |
| 1.2 | **Card** | `ui/card.svelte` | Border đen 2px, hard shadow 4px, nền off-white |
| 1.3 | **Input** | `ui/input.svelte` | Border đen 2px, focus ring → focus border-primary |
| 1.4 | **Badge** | `ui/badge.svelte` | Border đen, nền màu rực rỡ, font bold uppercase |
| 1.5 | **Alert** | `ui/alert.svelte` | Border đen, icon + hard shadow |
| 1.6 | **Dialog** | `ui/dialog_content.svelte` | Border đen, hard shadow lớn, nền màu |
| 1.7 | **Select** | `ui/select_trigger.svelte` + `select_content.svelte` | Border đen, hard shadow |
| 1.8 | **Table** | `ui/table.svelte` + related | Border đen, header nền accent |
| 1.9 | **Tabs** | `ui/tabs.svelte` + related | Active tab nền rực, border đen |
| 1.10 | **Separator** | `ui/separator.svelte` | 2px solid đen |
| 1.11 | **Textarea** | `ui/textarea.svelte` | Border đen 2px |
| 1.12 | **Checkbox** | `ui/checkbox.svelte` | Border đen, checked = nền primary |
| 1.13 | **Switch** | `ui/switch.svelte` | Border đen, track màu rực |
| 1.14 | **Tooltip** | `ui/tooltip_content.svelte` | Border đen, hard shadow |
| 1.15 | **Popover** | `ui/popover_content.svelte` | Border đen, hard shadow |
| 1.16 | **Dropdown Menu** | `ui/dropdown_menu_content.svelte` | Border đen, hard shadow, item hover nền accent |
| 1.17 | **Sheet** | `ui/sheet_content.svelte` | Border đen bên trái/phải |
| 1.18 | **Skeleton** | `ui/skeleton.svelte` | Border đen, nền accent nhạt |
| 1.19 | **Pagination** | `ui/pagination.svelte` | Button style neo, active = primary color |
| 1.20 | **Avatar** | `ui/avatar.svelte` | Border đen 2px |
| 1.21 | **Scroll Area** | `ui/scroll_area.svelte` | Scrollbar visible, styled |
| 1.22 | **Radio Group** | `ui/radio_group_item.svelte` | Border đen |
| 1.23 | **Calendar** | `ui/calendar.svelte` | Border đen, day selected = primary |
| 1.24 | **Label** | `ui/label.svelte` | Font bold |
| 1.25 | **Command** | `ui/command.svelte` + related | Border đen, hard shadow |

### Phase 2: Layout Components ⬜

| # | Component | File | Thay đổi |
|---|-----------|------|----------|
| 2.1 | **Sidebar** | `components/layout/app_sidebar.svelte` | Nền accent nhạt, border phải đen 2px, nav items có hover neo |
| 2.2 | **NavBar** | `components/layout/nav_bar.svelte` | Border dưới đen 2px, nền off-white |
| 2.3 | **App Layout** | `layouts/app_layout.svelte` | Nền pattern/texture nhẹ hoặc off-white |
| 2.4 | **Auth Layout** | `layouts/auth_layout.svelte` | Nền màu rực + pattern, card login neo style |
| 2.5 | **Profile Dropdown** | `components/profile_dropdown.svelte` | Border đen, hard shadow |
| 2.6 | **Search** | `components/search.svelte` | Input neo style |
| 2.7 | **Theme Switch** | `components/theme-switch.svelte` | Border đen, toggle neo |
| 2.8 | **Navigation** | `components/navigation.svelte.ts` | Thêm icons colorful, label style |
| 2.9 | **Sidebar UI components** | `components/ui/sidebar/` | Toàn bộ sidebar sub-components |
| 2.10 | **Notification Dialog** | `components/notification_dialog.svelte` | Neo style dialog |

### Phase 3: Pages — Cập nhật có sẵn ⬜

| # | Page | File | Thay đổi chính |
|---|------|------|----------------|
| 3.1 | **Home** | `pages/index.svelte` | Redesign hoàn toàn → Dashboard có thống kê, cards colorful |
| 3.2 | **Login** | `pages/auth/login.svelte` | Card login neo, nền rực rỡ, button bold |
| 3.3 | **Tasks Index** | `pages/tasks/index.svelte` | Cards neo, kanban columns có border đen |
| 3.4 | **Users Index** | `pages/users/index.svelte` | Table neo hoặc card grid |
| 3.5 | **Organizations Index** | `pages/organizations/index.svelte` | Cards neo |
| 3.6 | **Organizations Show** | `pages/organizations/show.svelte` | Detail layout neo |
| 3.7 | **Conversations** | `pages/conversations/*.svelte` | Chat bubbles neo style |
| 3.8 | **Settings** | `pages/settings/*.svelte` | Tab panels neo |
| 3.9 | **Profile** | `pages/profile/*.svelte` | Profile card neo, stats badges |
| 3.10 | **Reviews** | `pages/reviews/*.svelte` | Review cards neo |
| 3.11 | **Projects** | `pages/projects/*.svelte` | Project cards neo |
| 3.12 | **Marketplace** | `pages/marketplace/*.svelte` | Product-like cards neo |
| 3.13 | **Errors** | `pages/errors/*.svelte` | Error pages colorful, playful |

### Phase 4: Pages — Tạo mới (từ FRONTEND_AUDIT.md) ⬜

| # | Page | Mô tả | Style |
|---|------|-------|-------|
| 4.1 | `tasks/create.svelte` | Form tạo task | Form neo với inputs bold |
| 4.2 | `tasks/show.svelte` | Chi tiết task | Detail card neo lớn |
| 4.3 | `tasks/edit.svelte` | Form sửa task | Reuse create form |
| 4.4 | `tasks/applications.svelte` | DS ứng tuyển | Table/list neo |
| 4.5 | `users/create.svelte` | Form tạo user | Form neo |
| 4.6 | `users/show.svelte` | Chi tiết user | Profile card neo |
| 4.7 | `users/edit.svelte` | Form sửa user | Form neo |
| 4.8 | `organizations/create.svelte` | Form tạo org | Form neo |
| 4.9 | `organizations/all.svelte` | All orgs (admin) | Grid cards neo |
| 4.10 | `notifications/index.svelte` | Trang thông báo | List neo colorful |
| 4.11 | `applications/my-applications.svelte` | DS đơn ứng tuyển | Cards/list neo |
| 4.12 | `conversations/error.svelte` | Error chat | Error card neo |

### Phase 5: Polish & Sidebar ⬜

| # | Task | Mô tả |
|---|------|-------|
| 5.1 | Cập nhật sidebar navigation | Thêm items mới: Notifications, Applications, Reviews, Marketplace, Profile |
| 5.2 | Thêm sidebar icons colorful | Mỗi section có icon + color riêng |
| 5.3 | Responsive check | Test mobile/tablet neo style |
| 5.4 | Animation final pass | Đảm bảo hover/active states smooth |
| 5.5 | Accessibility audit | Contrast ratio vẫn ≥ 4.5:1, focus states visible |
| 5.6 | Performance check | Đảm bảo font loading không ảnh hưởng FCP |

---

## 🔧 Chi tiết thay đổi từng Component

### Button (`inertia/components/ui/button.svelte`)

**Hiện tại:**
```svelte
base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 ...'
variant.default: 'bg-primary text-primary-foreground hover:bg-primary/90'
```

**Neo-Brutalism:**
```svelte
base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold border-2 border-black shadow-neo transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:translate-x-neo-sm hover:translate-y-neo-sm hover:shadow-neo-hover active:translate-x-neo active:translate-y-neo active:shadow-neo-active dark:border-gray-300'

variants: {
  variant: {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-white',
    outline: 'bg-background text-foreground hover:bg-accent',
    secondary: 'bg-secondary text-secondary-foreground',
    ghost: 'border-transparent shadow-none hover:bg-accent hover:border-black hover:shadow-neo-sm',
    link: 'border-transparent shadow-none text-primary underline-offset-4 hover:underline',
    // Variants mới cho neo-brutalism
    accent: 'bg-accent text-accent-foreground',
    success: 'bg-neo-green text-foreground',
    warning: 'bg-neo-orange text-foreground',
  },
  size: {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-12 px-8 text-base',
    icon: 'h-10 w-10',
  }
}
```

### Card (`inertia/components/ui/card.svelte`)

**Hiện tại:**
```svelte
class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
```

**Neo-Brutalism:**
```svelte
class={cn('rounded-md border-2 border-black bg-card text-card-foreground shadow-neo dark:border-gray-300', className)}
```

### Input (`inertia/components/ui/input.svelte`)

**Hiện tại:**
```svelte
'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ...'
```

**Neo-Brutalism:**
```svelte
'flex h-10 w-full rounded-md border-2 border-black bg-background px-3 py-2 text-sm font-medium shadow-neo-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-300'
```

### Badge (`inertia/components/ui/badge.svelte`)

**Hiện tại:**
```svelte
base: 'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium ...'
```

**Neo-Brutalism:**
```svelte
base: 'inline-flex items-center justify-center rounded-md border-2 border-black px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-neo-sm dark:border-gray-300 ...'

variants: {
  variant: {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-white',
    outline: 'bg-background text-foreground',
    // Neo variants mới
    pink: 'bg-neo-pink text-foreground',
    blue: 'bg-neo-blue text-foreground',
    green: 'bg-neo-green text-foreground',
    orange: 'bg-neo-orange text-foreground',
    purple: 'bg-neo-purple text-foreground',
    lime: 'bg-neo-lime text-foreground',
    accent: 'bg-accent text-accent-foreground',
  }
}
```

### Dialog (`inertia/components/ui/dialog_content.svelte`)

**Neo-Brutalism:**
```svelte
'border-2 border-black bg-background shadow-neo-lg rounded-md dark:border-gray-300'
```

### Table (`inertia/components/ui/table*.svelte`)

**Neo-Brutalism:**
- Table container: `border-2 border-black rounded-md overflow-hidden shadow-neo`
- Table header: `bg-accent border-b-2 border-black font-bold uppercase text-xs tracking-wider`
- Table row hover: `hover:bg-accent/50`
- Table cell: `border-r border-black/20 last:border-r-0`

### Select (`inertia/components/ui/select_trigger.svelte`)

**Neo-Brutalism:**
```svelte
'border-2 border-black shadow-neo-sm rounded-md font-medium dark:border-gray-300'
```

---

## 🏗️ Chi tiết thay đổi từng Layout

### App Layout (`inertia/layouts/app_layout.svelte`)

Thay đổi nhẹ — nền background sử dụng CSS variable mới, container vẫn giữ.

### Sidebar (`inertia/components/layout/app_sidebar.svelte`)

```
┌─────────────────────────┐
│ 🌿 SUAR                 │ ← Logo lớn, bold, có icon
│─────────────────────────│ ← Separator 2px đen
│                          │
│ 📋 Tổng quan             │ ← Section header, uppercase
│  ▸ Bảng điều khiển      │
│  ▸ Nhiệm vụ        🔴3  │ ← Badge count colorful
│  ▸ Tin nhắn         🟢5  │
│  ▸ Thông báo        🟡2  │ ← MỚI
│  ▸ Đơn ứng tuyển        │ ← MỚI
│                          │
│ 🏢 Tổ chức               │
│  ▸ Tổ chức               │
│  ▸ Dự án                 │
│  ▸ Người dùng            │
│                          │
│ ⭐ Đánh giá               │ ← MỚI
│  ▸ Chờ đánh giá          │
│  ▸ Đánh giá của tôi      │
│                          │
│ 🏪 Marketplace            │ ← MỚI
│  ▸ Nhiệm vụ MP           │
│                          │
│─────────────────────────│
│ ⚙️ Cài đặt               │
│ 👤 Hồ sơ                 │ ← MỚI
└─────────────────────────┘
```

Style:
- Nền sidebar: `bg-accent/30` (vàng nhạt) hoặc `bg-muted`
- Border phải: `border-r-2 border-black`
- Nav item active: `bg-primary text-primary-foreground border-2 border-black shadow-neo-sm rounded-md`
- Nav item hover: `hover:bg-accent hover:translate-x-1 transition-transform`
- Section headers: `text-xs font-bold uppercase tracking-wider text-muted-foreground`

### NavBar (`inertia/components/layout/nav_bar.svelte`)

- Border dưới: `border-b-2 border-black`
- Nền: `bg-background`
- Search input: neo style (border đen, shadow)
- Profile avatar: `border-2 border-black`
- Notification bell: có badge count colorful

### Auth Layout (`inertia/layouts/auth_layout.svelte`)

- Nền: Pattern hoặc màu accent rực
- Login card: `border-2 border-black shadow-neo-lg bg-background`
- Có thể thêm decorative shapes (circles, squares) phía sau

---

## 📄 Chi tiết thay đổi từng Page

### Home / Dashboard (`pages/index.svelte`)

**Hiện tại:** Chỉ có text "Chào mừng"
**Neo-Brutalism:**

```
┌──────────────────────────────────────────────────────────┐
│  👋 Xin chào, {user.name}!                               │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │🟡 TASKS │  │🟢 DONE  │  │🔴 URGENT│  │🔵 MSGS  │    │
│  │   12    │  │    8    │  │    3    │  │    5    │    │  ← Stat cards neo
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │  📋 Nhiệm vụ gần đây │  │  🔔 Thông báo mới   │       │  ← Content cards
│  │  Task 1...           │  │  Notif 1...          │       │
│  │  Task 2...           │  │  Notif 2...          │       │
│  └─────────────────────┘  └─────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### Tasks Index (`pages/tasks/index.svelte`)

- Kanban columns: mỗi column có nền màu khác nhau (neo-pink, neo-blue, neo-green, neo-orange)
- Task cards: border đen, hard shadow, drag handle visible
- Filter bar: buttons neo style
- Create task button: `bg-primary text-white border-2 border-black shadow-neo` nổi bật

### Login (`pages/auth/login.svelte`)

```
┌──────────────────────────────────────────────┐
│         🌈 Nền accent hoặc pattern            │
│                                              │
│    ┌──────────────────────────────────┐       │
│    │ 🌿 SUAR                         │       │
│    │ ──────────────────────           │       │  ← Card neo lớn
│    │                                  │       │
│    │  Email                           │       │
│    │  ┌────────────────────────┐      │       │
│    │  │ your@email.com         │      │       │  ← Input neo
│    │  └────────────────────────┘      │       │
│    │                                  │       │
│    │  Mật khẩu                        │       │
│    │  ┌────────────────────────┐      │       │
│    │  │ ••••••••               │      │       │
│    │  └────────────────────────┘      │       │
│    │                                  │       │
│    │  ┌────────────────────────┐      │       │
│    │  │    ĐĂNG NHẬP →         │      │       │  ← Button neo primary
│    │  └────────────────────────┘      │       │
│    └──────────────────────────────────┘       │
└──────────────────────────────────────────────┘
```

### Conversations (`pages/conversations/*.svelte`)

- Chat bubble outgoing: `bg-primary text-white border-2 border-black shadow-neo-sm rounded-xl rounded-br-none`
- Chat bubble incoming: `bg-accent border-2 border-black shadow-neo-sm rounded-xl rounded-bl-none`
- Message input: neo style, send button bold primary

### Error Pages (`pages/errors/*.svelte`)

- Nền rực rỡ (mỗi error code 1 màu: 404=neo-orange, 500=neo-pink, 403=neo-purple)
- Text lớn, bold, playful
- Illustration hoặc emoji lớn
- Button "Quay lại" neo style

---

## 🌙 Dark Mode trong Neo-Brutalism

Neo-Brutalism dark mode vẫn giữ nguyên **tinh thần bold** nhưng:
- Nền tối (navy/near-black)
- Border chuyển sang **xám sáng** (#CCC) thay vì đen
- Shadow chuyển sang `rgba(255,255,255,0.15)`
- Màu accent vẫn rực nhưng **giảm brightness nhẹ** để không chói
- Text trắng/sáng

---

## 🎬 Animation & Interaction

### Hover States

| Element | Hover Effect |
|---------|-------------|
| Button | `translate(2px, 2px)` + shadow nhỏ lại |
| Card (clickable) | `translate(2px, 2px)` + shadow nhỏ lại |
| Sidebar item | `translateX(4px)` + nền accent |
| Badge | Scale nhẹ `scale(1.05)` |
| Avatar | Border color đổi sang primary |

### Active/Pressed States

| Element | Active Effect |
|---------|--------------|
| Button | `translate(4px, 4px)` + shadow = 0 (nhấn sâu) |
| Card | `translate(4px, 4px)` + shadow = 0 |

### Transition

```css
/* Nhanh và crisp — không smooth quá */
transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
```

### Page Transitions (Inertia)

- Giữ nguyên Inertia page transition mặc định
- Có thể thêm subtle fade-in cho cards (stagger animation)

---

## 📁 Pages cần tạo mới (theo Neo-Brutalism style)

> Danh sách đầy đủ từ FRONTEND_AUDIT.md, mỗi page tạo mới đều phải theo neo-brutalism style.

### Ưu tiên CAO 🔴

| # | Page | Backend Route | Components cần |
|---|------|---------------|----------------|
| 1 | `tasks/create.svelte` | `GET /tasks/create`, `POST /tasks` | TaskForm (neo inputs, selects) |
| 2 | `tasks/show.svelte` | `GET /tasks/:id` | TaskDetail card, StatusBadge, AssigneeAvatar |
| 3 | `tasks/edit.svelte` | `GET /tasks/:id/edit`, `PUT /tasks/:id` | Reuse TaskForm |
| 4 | `notifications/index.svelte` | `GET /notifications` | NotificationList, NotificationItem (colorful badges) |
| 5 | Dashboard (`index.svelte` upgrade) | `GET /` | StatCards, RecentTasks, RecentNotifications |

### Ưu tiên TRUNG BÌNH 🟡

| # | Page | Backend Route | Components cần |
|---|------|---------------|----------------|
| 6 | `users/show.svelte` | `GET /users/:id` | UserDetail card, RoleBadge, StatsGrid |
| 7 | `users/create.svelte` | `GET /users/create`, `POST /users` | UserForm |
| 8 | `users/edit.svelte` | `GET /users/:id/edit`, `PUT /users/:id` | Reuse UserForm |
| 9 | `organizations/create.svelte` | `POST /organizations` | OrgForm |
| 10 | `organizations/all.svelte` | `GET /all-organizations` | OrgGrid cards |
| 11 | `applications/my-applications.svelte` | `GET /my-applications` | ApplicationList, StatusBadge |
| 12 | `tasks/applications.svelte` | `GET /tasks/:taskId/applications` | ApplicationTable |

### Ưu tiên THẤP 🟢

| # | Page | Mô tả |
|---|------|-------|
| 13 | `conversations/error.svelte` | Error page cho chat |
| 14 | Workflow editor | UI quản lý task workflow transitions |

---

## ✅ Checklist tổng hợp

### Phase 0 — Foundation
- [ ] Cập nhật `inertia/css/app.css` — CSS variables light mode
- [ ] Cập nhật `inertia/css/app.css` — CSS variables dark mode
- [ ] Cập nhật `inertia/css/app.css` — Thêm neo utilities (.neo-border, .neo-shadow, .neo-hover)
- [ ] Cập nhật `tailwind.config.ts` — shadows, colors, border, translate
- [ ] Thêm font Space Grotesk (Google Fonts hoặc local)
- [ ] Test: build thành công, không lỗi

### Phase 1 — Base Components (25 components)
- [ ] Button — border đen, hard shadow, hover translate
- [ ] Card — border đen 2px, hard shadow
- [ ] Input — border đen 2px, shadow nhỏ
- [ ] Badge — border đen, nền rực, uppercase
- [ ] Alert — border đen, hard shadow
- [ ] Dialog — border đen, shadow lớn
- [ ] Select — border đen, shadow
- [ ] Table (6 files) — border đen, header nền accent
- [ ] Tabs — active nền rực, border đen
- [ ] Separator — 2px đen
- [ ] Textarea — border đen 2px
- [ ] Checkbox — border đen, checked = primary
- [ ] Switch — border đen
- [ ] Tooltip — border đen, shadow
- [ ] Popover — border đen, shadow
- [ ] Dropdown Menu — border đen, shadow, hover accent
- [ ] Sheet — border đen
- [ ] Skeleton — border đen, nền accent
- [ ] Pagination — button neo
- [ ] Avatar — border đen 2px
- [ ] Scroll Area — styled scrollbar
- [ ] Radio Group — border đen
- [ ] Calendar — border đen
- [ ] Label — font bold
- [ ] Command — border đen, shadow

### Phase 2 — Layouts (10 items)
- [ ] Sidebar — nền accent, border phải đen, nav items neo
- [ ] NavBar — border dưới đen, nền off-white
- [ ] App Layout — nền neo
- [ ] Auth Layout — nền rực + card neo
- [ ] Profile Dropdown — neo style
- [ ] Search — input neo
- [ ] Theme Switch — toggle neo
- [ ] Navigation config — icons, labels
- [ ] Sidebar UI sub-components
- [ ] Notification Dialog — neo

### Phase 3 — Existing Pages (13 pages)
- [ ] Home/Dashboard — redesign với stat cards
- [ ] Login — card login neo
- [ ] Tasks Index — kanban neo
- [ ] Users Index — table/cards neo
- [ ] Organizations Index — cards neo
- [ ] Organizations Show — detail neo
- [ ] Conversations — chat bubbles neo
- [ ] Settings — tabs neo
- [ ] Profile pages — profile card neo
- [ ] Reviews — cards neo
- [ ] Projects — cards neo
- [ ] Marketplace — cards neo
- [ ] Error pages — colorful, playful

### Phase 4 — New Pages (12 pages)
- [ ] tasks/create.svelte
- [ ] tasks/show.svelte
- [ ] tasks/edit.svelte
- [ ] tasks/applications.svelte
- [ ] users/create.svelte
- [ ] users/show.svelte
- [ ] users/edit.svelte
- [ ] organizations/create.svelte
- [ ] organizations/all.svelte
- [ ] notifications/index.svelte
- [ ] applications/my-applications.svelte
- [ ] conversations/error.svelte

### Phase 5 — Polish
- [ ] Sidebar navigation items mới (6 mục)
- [ ] Icons colorful cho sidebar
- [ ] Responsive test (mobile/tablet)
- [ ] Animation final pass
- [ ] Accessibility audit (contrast ≥ 4.5:1)
- [ ] Font loading performance
- [ ] Dark mode toàn bộ verified

---

## 📝 Ghi chú kỹ thuật

### Stack không thay đổi
- **AdonisJS v7** + **Inertia.js** + **Svelte 5** (runes mode)
- **shadcn-svelte** components (modify style, không thay cấu trúc)
- **Tailwind CSS** v4 (thêm custom utilities)
- **tailwind-variants** (tv) cho component variants

### Nguyên tắc migration
1. **Không thay đổi cấu trúc logic** — chỉ đổi CSS/style classes
2. **Không thay đổi data flow** — Controller → Query/Command → Repository → DB vẫn giữ
3. **Backward compatible** — nếu có component nào chưa update, vẫn hoạt động
4. **Component-first** — update UI components trước, pages tự động cập nhật phần lớn
5. **Mobile-first** — neo-brutalism trên mobile cần border/shadow nhỏ hơn desktop

### Tham khảo
- [neobrutalism.dev](https://neobrutalism.dev) — Component library neo-brutalism dựa trên shadcn/ui
- [ekmas/neobrutalism-components](https://github.com/ekmas/neobrutalism-components) — Source code tham khảo
- [Gumroad](https://gumroad.com) — Ví dụ thực tế neo-brutalism thành công
- [Figma Neo-Brutalism UI Kit](https://www.figma.com/community/file/1121448855292875009) — Design reference
