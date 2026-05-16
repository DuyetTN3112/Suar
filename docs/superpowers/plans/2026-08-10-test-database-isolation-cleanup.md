# Kế hoạch cô lập DB test và dọn dữ liệu lọt vào DB chính

> **Dành cho agent:** Bắt buộc dùng skill phụ `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans` để thực hiện kế hoạch theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Đảm bảo mọi runtime test của Adonis đều chọn `PG_TEST_DATABASE` thay vì `PG_DATABASE`, sau đó xóa riêng toàn bộ dữ liệu fixture đã lọt vào database phát triển trong cửa sổ leak đã xác nhận.

**Kiến trúc:** Giữ lại datastore guard và các safe runner hiện có, nhưng bắt buộc việc chọn database PostgreSQL ngay tại ranh giới cấu hình dùng chung để các entrypoint cũ như `node ace test ...` không thể âm thầm dùng database phát triển. Cleanup sẽ kiểm kê chính xác các dòng mục tiêu trước, sau đó xóa các record fixture liên quan trong một transaction trên `suar`, kèm kiểm tra sau cleanup để chứng minh phạm vi xóa.

**Công nghệ:** AdonisJS, TypeScript, PostgreSQL qua `pg`, Japa, datastore guard hiện có.

## Ràng buộc chung

- Không chạy query ghi dữ liệu trước khi xác nhận `current_database()` và predicate mục tiêu.
- Không dùng `cleanupTestData()` trên `suar`; đây là routine cleanup toàn bộ test database.
- Giữ nguyên 12 organization nền có từ trước cửa sổ leak và toàn bộ user/dữ liệu phát triển không liên quan.
- Không sửa các thay đổi lớn sẵn có trong working tree nếu không liên quan trực tiếp.
- Trước khi sửa symbol hiện có phải chạy `gitnexus impact`; trước khi commit phải chạy `gitnexus detect-changes`.

---

### Task 1: Thêm regression test cho entrypoint test cũ

**Files:**
- Tạo: `tests/unit/database_config.spec.ts`

**Giao diện:**
- Đọc: `config/database.ts` qua một process Node con với `NODE_ENV=test`, `PG_DATABASE=suar` và `PG_TEST_DATABASE=suar_test`.
- Tạo ra: Assertion chứng minh database PostgreSQL đang dùng là `suar_test`.

- [x] **Bước 1: Viết test fail trước**

```ts
import { spawnSync } from 'node:child_process'

import { test } from '@japa/runner'

test.group('Database configuration', () => {
  test('dùng PG_TEST_DATABASE khi NODE_ENV=test dù PG_DATABASE đang được set', ({ assert }) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import=@poppinss/ts-exec',
        '--input-type=module',
        '-e',
        "const { default: config } = await import('./config/database.ts'); console.log(config.connections.pg.connection.database)",
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PG_DATABASE: 'suar',
          PG_TEST_DATABASE: 'suar_test',
        },
      }
    )

    assert.equal(result.status, 0)
    assert.equal(result.stdout.trim(), 'suar_test')
  })
})
```

- [x] **Bước 2: Chạy test để xác nhận nó fail**

Chạy: `node --import=@poppinss/ts-exec bin/test.ts unit --files tests/unit/database_config.spec.ts`

Kỳ vọng: FAIL vì config hiện tại in ra `suar`.

### Task 2: Bắt buộc chọn database PostgreSQL test khi load config

**Files:**
- Sửa: `config/database.ts`

**Giao diện:**
- Đọc: `NODE_ENV`, `PG_DATABASE` và `PG_TEST_DATABASE` qua Adonis env.
- Tạo ra: Connection `pg` trỏ tới `PG_TEST_DATABASE` khi `NODE_ENV=test`; ném lỗi nếu target test bị thiếu hoặc trùng database phát triển.

- [x] **Bước 1: Implement việc chọn target tối thiểu**

```ts
const nodeEnv = env.get('NODE_ENV')
const developmentPgDatabase = env.get('PG_DATABASE')
const testPgDatabase = env.get('PG_TEST_DATABASE')

if (nodeEnv === 'test' && (!testPgDatabase || testPgDatabase === developmentPgDatabase)) {
  throw new Error('NODE_ENV=test requires PG_TEST_DATABASE to be a dedicated database')
}

const pgDatabase = nodeEnv === 'test' ? testPgDatabase : developmentPgDatabase
```

- [x] **Bước 2: Chạy regression test để xác nhận pass**

Chạy: `node --import=@poppinss/ts-exec bin/test.ts unit --files tests/unit/database_config.spec.ts`

Kỳ vọng: PASS.

### Task 3: Kiểm kê và xóa dữ liệu fixture đã lọt

**Files:**
- Không sửa source ứng dụng.

**Giao diện:**
- Đọc: Kết nối PostgreSQL tới `suar` và toàn bộ organization/user fixture được tạo trong khung thời gian leak đã xác nhận ngày 08/08/2026.
- Tạo ra: Không còn fixture trong cửa sổ leak ở `suar`; 12 organization nền không phải test vẫn còn nguyên.

- [x] **Bước 1: Kiểm tra lại database mục tiêu**

Chạy query read-only in `current_database()`, số target, tổng số organization và khung thời gian leak. Dừng ngay nếu database không phải `suar` hoặc số lượng/khung thời gian khác inventory đã xác nhận.

- [x] **Bước 2: Xóa dependency graph của fixture trong một transaction**

Dùng script Node `pg` riêng với transaction và bảng target tạm. Xóa record phụ thuộc theo ID của organization/project/task/user mục tiêu, sau đó xóa organization mục tiêu và chỉ xóa user được tạo cho fixture nếu user đó không còn tham chiếu tới organization/project nào khác.

- [x] **Bước 3: Kiểm tra sau cleanup**

Chạy các count read-only trên `suar` cho organization/user/project/task/member trong cửa sổ leak và tổng organization. Kỳ vọng: các count target bằng 0 và tổng organization là 12.

### Task 4: Kiểm chứng mọi entrypoint test được hỗ trợ

**Files:**
- Chỉ sửa `docs_AI/integration_test_db_connect.md` nếu hướng dẫn command vẫn cho phép một đường chạy bypass config đã enforce.

**Giao diện:**
- Đọc: database config dùng chung và các safe runner hiện có.
- Tạo ra: Bằng chứng rằng `node ace test ...`, `bin/test.ts`, integration-safe và E2E đều resolve tới `suar_test` trước khi app boot.

- [x] **Bước 1: Chạy regression test database config**
- [x] **Bước 2: Chạy các unit test datastore guard hiện có**
- [x] **Bước 3: Chạy một backend test mục tiêu qua entrypoint cũ sau khi config assertion đã pass**
- [x] **Bước 4: Chạy `gitnexus detect-changes` và kiểm tra phạm vi thay đổi**
