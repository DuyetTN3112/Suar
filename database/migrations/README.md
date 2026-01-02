# Hướng dẫn Database Migrations (AdonisJS / Lucid)

Migration đã phát hành là lịch sử bất biến. Không xóa, đổi tên, sửa nội dung,
hoặc tái sử dụng timestamp của migration đã được áp dụng ở bất kỳ môi trường
chia sẻ nào. `database/schema.ts` chỉ là snapshot TypeScript của model; nó không
chứa đầy đủ DDL, database functions, extensions, constraints, indexes hoặc dữ
liệu tham chiếu và không thể thay thế lịch sử migration.

Xem quy trình khôi phục chi tiết tại
[`docs/09-operations/migration-ledger-recovery.md`](../../docs/09-operations/migration-ledger-recovery.md).

## Quy tắc bắt buộc

- Mỗi migration mới dùng một timestamp duy nhất và phải được đưa vào source
  control cùng code phụ thuộc vào schema đó. Format và review file trước lần
  áp dụng đầu tiên; repository-wide formatter intentionally bỏ qua thư mục này
  để không làm đổi checksum của migration đã phát hành.
- Chạy migration trên staging hoặc bản sao database trước production.
- `migration:status` có bất kỳ dòng `pending`, `corrupt`, hoặc
  `missing on filesystem` đều chặn release. Không chỉ dựa vào exit code của
  command vì Lucid có thể trả `0` dù ledger chứa migration corrupt.
- Release phải chạy `pnpm run db:migrations:verify`. Gate này chỉ đọc
  filesystem và ledger, không tạo/sửa bảng; exit code `0` là sạch, `2` là vi
  phạm integrity/policy, và `1` là lỗi vận hành nên chưa thể kết luận.
- CI phải kiểm tra cả clean bootstrap trên PostgreSQL rỗng và upgrade từ
  snapshot của phiên bản production trước.
- Trước migration production, sao lưu database và migration ledger. Sau điểm
  baseline, ưu tiên forward-fix hoặc PITR thay vì sửa ledger trực tiếp.
- Không tạo file migration rỗng mang tên cũ để che trạng thái corrupt.

## Các lệnh cơ bản

### 1. Tạo migration mới

```bash
node ace make:migration <ten_migration>
```

Ví dụ:

```bash
node ace make:migration create_users_table
```

### 2. Chạy migration

Database phát triển:

```bash
node ace migration:run
```

Database test:

```bash
pnpm run db:test:migrate
```

### 3. Kiểm tra trạng thái

```bash
node ace migration:status
pnpm run db:migrations:verify
pnpm run db:migrations:verify -- --json
```

Đọc và xác minh nội dung từng trạng thái; exit code `0` không đồng nghĩa ledger
sạch đối với `migration:status`. `db:migrations:verify` trả `0` là điều kiện cần,
không thay thế change approval, backup, staging proof hoặc upgrade rehearsal.

Gate bắt buộc file `database/migration-checksums.json` được source control.
Manifest phải nằm ngoài migration path để Lucid không nạp nhầm nó như một
migration:

```json
{
  "version": 1,
  "algorithm": "sha256",
  "migrations": {
    "database/migrations/20260701000000_example": "<sha256>"
  },
  "schemaDumps": {
    "database/schema/pg-schema.sql": "<sha256>"
  }
}
```

Chỉ thêm checksum migration mới trước khi migration được áp dụng. Không
regenerate checksum để hợp thức hóa file đã phát hành bị sửa. Không tạo manifest
lần đầu từ một ledger đang `corrupt`; trước tiên phải phục hồi artifact gốc hoặc
tạo canonical baseline đã được change approval, kiểm thử clean bootstrap và
đối chiếu schema fingerprint. Schema dump chỉ hợp lệ khi SQL, sidecar manifest,
ledger context và checksum đều khớp.

Sidecar của schema dump phải khai báo trạng thái approval. Candidate vẫn được
gate đối chiếu và báo số migration đã squash, nhưng release bị chặn bằng
`schema_dump_approval_required`:

```json
{
  "baselineApproval": {
    "status": "approved",
    "changeId": "DB-CHANGE-ID",
    "databaseOwner": "owner-identity",
    "releaseOwner": "release-identity",
    "approvedAt": "2026-07-24T03:00:00.000Z"
  }
}
```

Không tự điền hoặc giả mạo các trường approval. Baseline dựng từ local/staging
phải giữ `status: "candidate"` cho đến khi được đối chiếu với nguồn production
có thẩm quyền.

### 4. Rollback

```bash
node ace migration:rollback
```

Chỉ rollback khi file bất biến còn tồn tại và `down()` đã được kiểm thử trên
database clone. Không rollback xuyên canonical baseline trên production.

## Mẫu migration

Tham khảo
[00000000000000_template_migration.ts.example](./00000000000000_template_migration.ts.example).
