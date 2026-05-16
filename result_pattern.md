## 15. Result Pattern là gì?

Result Pattern biểu diễn kết quả của một thao tác bằng một giá trị có hai khả năng:

```text
Success(value)
hoặc
Failure(error)
```

Thay vì:

```ts
const user = await createUser();
```

và không biết function có thể throw gì, function trả:

```ts
Result<User, CreateUserError>
```

Nghĩa là:

* Thành công: có `User`.
* Thất bại: có `CreateUserError`.

Ví dụ:

```ts
type Result<T, E> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: E;
    };
```

Sử dụng:

```ts
const result = await createUser();

if (!result.success) {
  console.log(result.error);
  return;
}

console.log(result.value);
```

TypeScript sẽ narrow type theo `success`.

---

# 16. Result Pattern giải quyết vấn đề gì?

## Với exception

```ts
async function createUser(input: CreateUserInput): Promise<User> {
  if (await userRepository.existsByEmail(input.email)) {
    throw new Error("Email already exists");
  }

  return userRepository.create(input);
}
```

Khi đọc signature:

```ts
Promise<User>
```

Ta chỉ nhìn thấy khả năng thành công.

Ta không biết:

* Có thể throw hay không.
* Throw loại lỗi nào.
* Người gọi cần xử lý lỗi gì.
* Lỗi nào là business error.
* Lỗi nào là lỗi hệ thống.

TypeScript không có checked exception như Java.

## Với Result

```ts
type CreateUserError =
  | EmailAlreadyExistsError
  | InvalidInvitationError;

async function createUser(
  input: CreateUserInput,
): Promise<Result<User, CreateUserError>> {
  // ...
}
```

Signature cho thấy rõ toàn bộ kết quả được dự kiến:

```text
Thành công: User
Thất bại dự kiến:
- EmailAlreadyExistsError
- InvalidInvitationError
```

---

# 17. Expected error và unexpected error

Đây là tư tưởng trung tâm của Result Pattern.

## Expected error

Là thất bại bình thường, có thể dự đoán trong nghiệp vụ:

* Email đã tồn tại.
* User không có quyền.
* Số dư không đủ.
* Sản phẩm hết hàng.
* Order đã bị hủy.
* Coupon hết hạn.
* Resource không tồn tại.
* Dữ liệu đầu vào không hợp lệ.

Những lỗi này thường phù hợp với `Result.fail()`.

## Unexpected error

Là lỗi hệ thống hoặc bug không nằm trong luồng nghiệp vụ bình thường:

* Database mất kết nối.
* Null reference do bug.
* Dependency bị crash.
* File system hỏng.
* Lỗi lập trình.
* Out of memory.
* Invariant nội bộ bị phá vỡ ngoài dự kiến.

Những lỗi này thường nên:

* Throw exception.
* Được global error handler bắt.
* Log đầy đủ.
* Trả HTTP 500.
* Báo monitoring.

Nguyên tắc thực tế:

> Result cho thất bại dự kiến. Exception cho lỗi bất ngờ hoặc hệ thống không thể xử lý tại vị trí hiện tại.

Không nên biến mọi exception thành một generic `Result.fail("Something went wrong")`, vì sẽ làm mất stack trace và che giấu bug.

---

# 18. Cài đặt Result cơ bản bằng discriminated union

Đây là cách đơn giản và phù hợp TypeScript:

```ts
export type Result<T, E> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: E;
    };

export function ok<T>(value: T): Result<T, never> {
  return {
    ok: true,
    value,
  };
}

export function fail<E>(error: E): Result<never, E> {
  return {
    ok: false,
    error,
  };
}
```

Sử dụng:

```ts
type DivideError = {
  code: "DIVISION_BY_ZERO";
};

function divide(
  a: number,
  b: number,
): Result<number, DivideError> {
  if (b === 0) {
    return fail({
      code: "DIVISION_BY_ZERO",
    });
  }

  return ok(a / b);
}
```

Consumer:

```ts
const result = divide(10, 0);

if (!result.ok) {
  console.log(result.error.code);
  return;
}

console.log(result.value);
```

---

# 19. Dùng class cho Result

Có thể dùng class:

```ts
class Result<T, E> {
  private constructor(
    private readonly success: boolean,
    private readonly internalValue?: T,
    private readonly internalError?: E,
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(true, value);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  isOk(): boolean {
    return this.success;
  }

  isFailure(): boolean {
    return !this.success;
  }

  get value(): T {
    if (!this.success) {
      throw new Error("Cannot access value of failed Result");
    }

    return this.internalValue as T;
  }

  get error(): E {
    if (this.success) {
      throw new Error("Cannot access error of successful Result");
    }

    return this.internalError as E;
  }
}
```

Tuy nhiên discriminated union thường hợp tự nhiên hơn với TypeScript vì type narrowing tốt:

```ts
if (result.ok) {
  result.value;
} else {
  result.error;
}
```

Class hữu ích nếu cần nhiều operation như `map`, `flatMap`, `match`, nhưng có thể tạo thêm abstraction không cần thiết.

---

# 20. Error trong Result nên là gì?

Không nên chỉ dùng string:

```ts
return fail("Email already exists");
```

String có nhiều vấn đề:

* Không type-safe.
* Khó map sang HTTP status.
* Khó attach metadata.
* Dễ phụ thuộc vào câu chữ.
* Không thể đảm bảo xử lý hết các trường hợp.

Tốt hơn là dùng typed error.

## Object union

```ts
type CreateUserError =
  | {
      code: "EMAIL_ALREADY_EXISTS";
      email: string;
    }
  | {
      code: "INVITATION_NOT_FOUND";
      invitationId: string;
    }
  | {
      code: "INVITATION_EXPIRED";
      expiredAt: Date;
    };
```

Xử lý:

```ts
switch (result.error.code) {
  case "EMAIL_ALREADY_EXISTS":
    break;

  case "INVITATION_NOT_FOUND":
    break;

  case "INVITATION_EXPIRED":
    break;
}
```

## Error class

```ts
class EmailAlreadyExistsError extends Error {
  readonly code = "EMAIL_ALREADY_EXISTS";

  constructor(readonly email: string) {
    super(`Email already exists: ${email}`);
    this.name = "EmailAlreadyExistsError";
  }
}
```

Cả hai cách đều được.

Object union thường đơn giản và dễ serialize. Error class giữ được stack trace nếu cần, nhưng expected business failure không phải lúc nào cũng cần stack trace.

---

# 21. Đừng trộn error code với message dành cho người dùng

Business error:

```ts
{
  code: "EMAIL_ALREADY_EXISTS",
  email: "test@example.com"
}
```

API response:

```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email này đã được sử dụng."
  }
}
```

Không nên để domain trả thẳng message giao diện:

```ts
return fail({
  message: "Email này đã được sử dụng, vui lòng đăng nhập"
});
```

Vì:

* Domain không nên phụ thuộc ngôn ngữ.
* Có thể có web, mobile, admin với message khác nhau.
* Việc dịch ngôn ngữ thuộc presentation layer.
* Message có thể thay đổi nhưng error code cần ổn định.

---

# 22. Result và HTTP status code

Use case không nên trả HTTP status:

```ts
// Không nên
return {
  status: 409,
  message: "Email already exists",
};
```

Vì use case có thể được gọi từ:

* HTTP controller.
* CLI.
* Queue consumer.
* Cron job.
* GraphQL resolver.
* WebSocket handler.

Domain/application layer nên trả lỗi nghiệp vụ:

```ts
return fail({
  code: "EMAIL_ALREADY_EXISTS",
});
```

Controller map lỗi sang HTTP:

```ts
switch (result.error.code) {
  case "EMAIL_ALREADY_EXISTS":
    return response.status(409).json({
      error: {
        code: result.error.code,
        message: "Email already exists",
      },
    });

  case "INVALID_INVITATION":
    return response.status(400).json({
      error: {
        code: result.error.code,
        message: "Invitation is invalid",
      },
    });
}
```

HTTP là chi tiết của delivery mechanism, không phải business logic.

---

# 23. Authorization trả lỗi gì?

Cần phân biệt:

## Chưa xác thực

Không có token, token không hợp lệ, token hết hạn:

```http
401 Unauthorized
```

Tên status hơi gây nhầm; thực chất nó thường mang nghĩa **unauthenticated**.

## Đã xác thực nhưng không có quyền

User đăng nhập hợp lệ nhưng không được phép thực hiện hành động:

```http
403 Forbidden
```

Trong use case, không nên trả trực tiếp 403:

```ts
return fail({
  code: "PERMISSION_DENIED",
});
```

Controller map:

```ts
case "PERMISSION_DENIED":
  return response.status(403).json(...);
```

Ngoài ra, đôi khi hệ thống cố ý trả `404 Not Found` thay cho `403` để tránh tiết lộ rằng resource tồn tại. Đây là quyết định bảo mật ở API boundary.

---

# 24. Ví dụ Result Pattern hoàn chỉnh

## Error definitions

```ts
type CreateUserError =
  | {
      code: "EMAIL_ALREADY_EXISTS";
      email: string;
    }
  | {
      code: "REGISTRATION_CLOSED";
    };
```

## Use case

```ts
interface CreateUserCommand {
  email: string;
  plainPassword: string;
  fullName: string;
}

class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly registrationPolicy: RegistrationPolicy,
  ) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<User, CreateUserError>> {
    if (!this.registrationPolicy.isRegistrationOpen()) {
      return fail({
        code: "REGISTRATION_CLOSED",
      });
    }

    const normalizedEmail = command.email.trim().toLowerCase();

    const emailExists = await this.users.existsByEmail(normalizedEmail);

    if (emailExists) {
      return fail({
        code: "EMAIL_ALREADY_EXISTS",
        email: normalizedEmail,
      });
    }

    const passwordHash = await this.passwordHasher.hash(
      command.plainPassword,
    );

    const user = User.create({
      email: normalizedEmail,
      passwordHash,
      fullName: command.fullName,
    });

    await this.users.save(user);

    return ok(user);
  }
}
```

Chú ý:

* Email đã tồn tại là expected business failure → Result.
* Database mất kết nối không được catch rồi đổi thành `EMAIL_ALREADY_EXISTS`.
* Database exception được bubble lên global handler → 500.

---

# 25. Result với `void`

Một operation thành công nhưng không cần trả dữ liệu:

```ts
async function deleteUser(
  userId: string,
): Promise<Result<void, UserNotFoundError>> {
  const user = await repository.findById(userId);

  if (!user) {
    return fail({
      code: "USER_NOT_FOUND",
      userId,
    });
  }

  await repository.delete(userId);

  return ok(undefined);
}
```

Có thể định nghĩa helper:

```ts
const success = (): Result<void, never> => ok(undefined);
```

---

# 26. Result với nhiều lỗi

```ts
type TransferMoneyError =
  | {
      code: "SOURCE_ACCOUNT_NOT_FOUND";
    }
  | {
      code: "DESTINATION_ACCOUNT_NOT_FOUND";
    }
  | {
      code: "INSUFFICIENT_BALANCE";
      available: number;
      requested: number;
    }
  | {
      code: "ACCOUNT_BLOCKED";
      accountId: string;
    };
```

Function signature:

```ts
Promise<Result<TransferReceipt, TransferMoneyError>>
```

Đây là documentation có thể được compiler kiểm tra.

---

# 27. Exhaustive checking

Khi error là union, nên buộc code xử lý đủ trường hợp:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

Controller:

```ts
switch (error.code) {
  case "EMAIL_ALREADY_EXISTS":
    return response.status(409).json(...);

  case "REGISTRATION_CLOSED":
    return response.status(403).json(...);

  default:
    return assertNever(error);
}
```

Nếu sau này thêm error:

```ts
{
  code: "INVALID_INVITATION"
}
```

TypeScript có thể báo controller chưa xử lý trường hợp mới.

---

# 28. `map`

`map` biến đổi success value nhưng giữ nguyên error.

```ts
function map<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => U,
): Result<U, E> {
  if (!result.ok) {
    return result;
  }

  return ok(mapper(result.value));
}
```

Ví dụ:

```ts
const userResult: Result<User, CreateUserError> =
  await createUser(command);

const mappedResult = map(
  userResult,
  user => toUserResponseDto(user),
);
```

Nếu `userResult` thất bại, mapper không chạy.

---

# 29. `mapError`

Biến đổi error nhưng giữ nguyên success value:

```ts
function mapError<T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => F,
): Result<T, F> {
  if (result.ok) {
    return result;
  }

  return fail(mapper(result.error));
}
```

Dùng khi cần chuyển lỗi giữa các layer:

```ts
const result = mapError(repositoryResult, error => {
  switch (error.code) {
    case "DUPLICATE_KEY":
      return {
        code: "EMAIL_ALREADY_EXISTS",
      } as const;
  }
});
```

Nhưng không nên để use case phụ thuộc quá sâu vào error code riêng của database. Repository thường nên che giấu chi tiết infrastructure.

---

# 30. `flatMap` hoặc `andThen`

Khi bước tiếp theo cũng trả Result:

```ts
function flatMap<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => Result<U, E>,
): Result<U, E> {
  if (!result.ok) {
    return result;
  }

  return mapper(result.value);
}
```

Ví dụ:

```ts
const result = flatMap(
  validateEmail(rawEmail),
  email => createUserWithEmail(email),
);
```

Nếu `validateEmail` fail, `createUserWithEmail` không chạy.

Đây là nền tảng của cách tư duy “railway-oriented programming”:

```text
Success rail ───────────────→
          \ failure
Failure rail ───────────────→
```

Mỗi operation thành công thì tiếp tục trên đường success. Thất bại thì chuyển sang failure rail và bỏ qua các bước sau.

---

# 31. `match`

`match` buộc người gọi xử lý cả hai nhánh:

```ts
function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    fail: (error: E) => R;
  },
): R {
  return result.ok
    ? handlers.ok(result.value)
    : handlers.fail(result.error);
}
```

Sử dụng:

```ts
return match(result, {
  ok: user =>
    response.status(201).json(toUserResponseDto(user)),

  fail: error =>
    mapCreateUserErrorToHttp(error, response),
});
```

---

# 32. Async Result

Trong TypeScript, async Result thường có dạng:

```ts
Promise<Result<T, E>>
```

Có thể tạo alias:

```ts
type AsyncResult<T, E> = Promise<Result<T, E>>;
```

Use case:

```ts
async execute(
  command: CreateUserCommand,
): AsyncResult<User, CreateUserError> {
  // ...
}
```

Đừng nhầm:

```ts
Result<Promise<T>, E>
```

với:

```ts
Promise<Result<T, E>>
```

Trong backend, dạng thứ hai thường tự nhiên hơn vì operation bất đồng bộ rồi mới trả success/failure.

---

# 33. Có nên `try/catch` bên trong Result function không?

Không phải lúc nào cũng cần.

Ví dụ không tốt:

```ts
async function createUser(): Promise<Result<User, string>> {
  try {
    // toàn bộ logic
  } catch {
    return fail("Something went wrong");
  }
}
```

Nó làm mất:

* Loại exception.
* Stack trace nếu không log đúng.
* Phân biệt bug và business failure.
* Khả năng global handler xử lý.

Tốt hơn:

```ts
async function createUser(): Promise<Result<User, CreateUserError>> {
  const exists = await repository.existsByEmail(email);

  if (exists) {
    return fail({
      code: "EMAIL_ALREADY_EXISTS",
    });
  }

  const user = await repository.save(...);

  return ok(user);
}
```

Database exception vẫn throw.

Chỉ catch khi:

1. Có thể xử lý lỗi tại đây.
2. Có thể chuyển một lỗi infrastructure cụ thể thành lỗi có ý nghĩa hơn.
3. Cần cleanup hoặc thêm context rồi rethrow.
4. Đang ở system boundary như controller, worker, global handler.

---

# 34. Result không thay thế hoàn toàn exception

Đây là hiểu nhầm phổ biến.

Không nên chọn một trong hai theo kiểu:

```text
Hoặc Result
Hoặc exception
```

Một hệ thống tốt thường dùng cả hai:

```text
Expected business failures
        ↓
Result

Unexpected technical failures / bugs
        ↓
Exception
```

Ví dụ chuyển tiền:

| Trường hợp                   | Cách biểu diễn                   |
| ---------------------------- | -------------------------------- |
| Không đủ số dư               | Result failure                   |
| Tài khoản bị khóa            | Result failure                   |
| Người dùng không có quyền    | Result failure                   |
| Database timeout             | Exception                        |
| Bug truy cập `undefined.id`  | Exception                        |
| Invariant bất khả thi bị phá | Exception hoặc panic-level error |

---

# 35. Khi nào Result Pattern phù hợp?

Result rất phù hợp khi:

* Function có nhiều thất bại dự kiến.
* Người gọi phải ra quyết định dựa trên loại lỗi.
* Business rule phức tạp.
* Muốn error contract rõ ràng.
* TypeScript cần hỗ trợ exhaustive checking.
* Application/domain layer không nên biết HTTP.
* Muốn giảm việc dùng exception cho control flow.

Ví dụ tốt:

```ts
reserveInventory()
applyCoupon()
cancelOrder()
transferMoney()
approveApplication()
createUser()
```

---

# 36. Khi nào không cần Result?

Không phải function nào cũng cần:

```ts
function add(a: number, b: number): Result<number, never>
```

Nếu operation thực tế không có expected failure, chỉ cần:

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

Các function getter đơn giản cũng không cần Result:

```ts
user.getFullName()
order.total()
pagination.offset()
```

Đừng bọc mọi thứ bằng Result chỉ để “đúng pattern”. Điều đó tạo noise.

---

# 37. Result Pattern và `null`

Một repository có thể dùng:

```ts
findById(id): Promise<User | null>
```

Hoặc:

```ts
findById(id): Promise<Result<User, UserNotFoundError>>
```

Không có đáp án tuyệt đối.

## `User | null`

Phù hợp khi “không tìm thấy” là một trạng thái tra cứu bình thường:

```ts
const user = await repository.findById(id);

if (!user) {
  // quyết định tùy use case
}
```

Repository không tự quyết định “không tồn tại” có phải lỗi hay không.

## Result

Phù hợp khi operation mang ngữ nghĩa yêu cầu resource phải tồn tại:

```ts
getRequiredUser(id): Result<User, UserNotFoundError>
```

Một cách thiết kế hợp lý:

```ts
repository.findById(): Promise<User | null>
```

Sau đó use case quyết định:

```ts
const user = await repository.findById(id);

if (!user) {
  return fail({
    code: "USER_NOT_FOUND",
  });
}
```

---

# 38. Result và Option/Maybe

`Option<T>` biểu diễn:

```text
Some(value)
hoặc
None
```

Không có thông tin chi tiết về lý do không có giá trị.

```ts
type Option<T> =
  | { some: true; value: T }
  | { some: false };
```

`Result<T, E>` biểu diễn:

```text
Success(value)
hoặc
Failure(error)
```

Dùng Option khi chỉ cần biết có hoặc không:

```ts
findCachedValue(): Option<Value>
```

Dùng Result khi cần biết nguyên nhân:

```ts
createOrder(): Result<Order, CreateOrderError>
```

---

# 39. Result và Either

Trong functional programming:

```text
Either<Left, Right>
```

Thường quy ước:

* `Left` = failure.
* `Right` = success.

Result thực chất là một phiên bản dễ đọc hơn trong ngữ cảnh success/failure:

```ts
Result<Success, Error>
```

Ý tưởng gần như tương đương.

---

# 40. Anti-pattern của Result

## 40.1 Dùng boolean

```ts
return {
  success: false,
};
```

Người gọi không biết thất bại vì gì.

Tốt hơn:

```ts
return fail({
  code: "INSUFFICIENT_BALANCE",
});
```

---

## 40.2 Error chỉ là string

```ts
Result<User, string>
```

Dẫn đến switch theo message:

```ts
if (result.error === "Email already exists") {
  // ...
}
```

Câu chữ thay đổi là logic hỏng.

---

## 40.3 Result vừa fail vừa throw cùng một business case

```ts
if (emailExists) {
  if (someCondition) {
    throw new EmailExistsError();
  }

  return fail(new EmailExistsError());
}
```

Một loại thất bại phải có convention rõ ràng.

---

## 40.4 Catch mọi exception và biến thành business error

```ts
try {
  await repository.save(user);
} catch {
  return fail({
    code: "EMAIL_ALREADY_EXISTS",
  });
}
```

Database có thể lỗi vì:

* Mất kết nối.
* Timeout.
* Constraint khác.
* Syntax error.
* Migration sai.

Không được đoán tất cả là duplicate email.

---

## 40.5 Result chứa HTTP response

```ts
Result<User, {
  statusCode: 409;
  message: string;
}>
```

Làm application layer phụ thuộc HTTP.

---

## 40.6 Nested Result

```ts
Result<Result<User, ErrorA>, ErrorB>
```

Thường là dấu hiệu cần `flatMap` hoặc thiết kế lại error union:

```ts
Result<User, ErrorA | ErrorB>
```

---

## 40.7 Không xử lý Result

```ts
const result = await useCase.execute(command);

// Giả định thành công
return result.value;
```

Audit tiếp theo cũng đã chuẩn hóa raw `Error` trong các module filtering, search và taxonomy thành
typed exception thuộc `errors`: conflict dùng `ConflictException`, dữ liệu persisted hỏng dùng
`PersistedDataIntegrityException`, còn invariant nội bộ dùng `InvariantViolationException`. Điều này
giữ nguyên error message nội bộ nhưng không để exception mất classification/reporting semantics.

Search public contracts không còn import trực tiếp `filtering/domain`. Search giữ một filter-expression
contract riêng ở `search/public_contracts`; duplication này có chủ đích để các module không bị phụ thuộc
ngược vào domain nội bộ của nhau.

Các verification gate gần nhất: exception-boundary pass (`2536` production modules/commands, `417` HTTP
boundary files), module-domain-boundary pass (`2534` files, `0` transitional violations), và
public-contract-surface pass (`223` surface files, `0` transitional violations). Module-layer và một
architecture boundary suite hiện đã có inter-process lock cho probe tests; suite tuần tự `48/48` pass.
Module-layer placement cũng pass (`2505` production TS, `36` composition factories, `32` Ace commands).
Lượt full unit ổn định gần nhất `2149/2149` pass; một lượt chạy lại trong lúc app server đang chạy
batch architecture đồng thời bị 1 probe race, không có production assertion failure. Lượt full integration mới nhất đạt `1252` pass, `1` flaky failure
ở `testing_organization_gateway` (unique pending-membership race), và `38` Redis drill skip có điều
kiện. Filter Alert repository/worker/notification delivery, Elasticsearch executor và toàn bộ
architecture integration checks đều pass trong cùng lượt; failure còn lại tái chạy riêng 10 lần đều
pass, nên chưa có bằng chứng đủ để sửa production gateway bằng workaround.

Elasticsearch test cũng đã được xác nhận riêng trên service tách biệt `127.0.0.1:9201` với prefix
`suar_test_`: suite filter executor pass `6/6`; development endpoint vẫn là `9200` và không bị dùng
cho test.

Cache và Events cũng đã có base local riêng tại `actions/base_command.ts` và
`actions/base_query.ts`. Các command/query quản trị outbox giữ nguyên public signature hiện hữu
(bao gồm execution context và transaction), đồng thời cung cấp `executeAndWrap()` cho boundary cần
canonical `Result`; `AppException` được chuyển thành `Result.fail`, còn lỗi hạ tầng ngoài dự kiến vẫn
được throw để không che khuất sự cố. Query authorization của Cache vẫn giữ input `actorId: string`,
không đổi compatibility contract.

Authorization cũng đã có `actions/base_command.ts` và `actions/base_query.ts` riêng. Các custom-role
command/query dùng tuple arguments để giữ nguyên signature legacy (bao gồm optional arguments và
zero-argument refresh), đồng thời có `executeAndWrap()` cho transport boundary. Static system-admin
policy query được giữ ngoài base vì nó là policy contract đặc biệt với static entrypoint và wrapper
riêng.

Errors và Testing cũng đã có base local riêng. Error-retention command/query và required-organization
query dùng `errors/actions/base_command.ts` hoặc `base_query.ts`; Testing dùng tuple arguments để
giữ nguyên các command fixture/token/bootstrap hiện hữu. Cả hai module đều chuyển expected
`AppException` thành canonical `Result.fail()` và rethrow lỗi ngoài dự kiến.

Audit, HTTP, Marketplace và Observability hiện được giữ ngoài generic root base: Audit có
`BaseWriteAuditLogCommand` với best-effort/critical semantics riêng; HTTP là transport module với
signature/context đặc thù; Marketplace đã trả `Result` trực tiếp qua consumer-owned flow ports;
Observability là telemetry command với failure semantics riêng. Ép các module này vào một `execute()`
wrapper chung sẽ tạo nested `Result` hoặc làm mất semantics hiện hữu. Taxonomy vẫn có cặp base local,
nhưng governance orchestrator dùng các wrapper operation riêng (`preview/start/apply/status`) thay vì
ép vào một `execute()` duy nhất.

Full `pnpm run typecheck` hiện còn bị chặn bởi dirty-worktree taxonomy test truy cập property `plan`
không có trong result type hiện tại; `svelte-check` trước đó đã pass `0 errors, 0 warnings`. Việc xác
nhận này cũng phát hiện và sửa import type `.svelte` quá mơ hồ trong marketplace
filter test, cùng một số type drift ở review request mapper và Elasticsearch query builder. Notification
route request mapper bị thiếu trong dirty worktree đã được khôi phục cùng unit test contract;
organization context/invitation mappers và sprint review lifecycle mapper cũng đã được khôi phục để
giữ public request contracts không bị drift.

Skills project-role/project-skill read queries hiện kế thừa `skills/actions/base_query.ts` và vẫn giữ
`execute(projectId)` cho composition compatibility; canonical `executeAndWrap({ projectId })` là boundary
Result mới. Admin search projection HTTP cũng dùng contract-owned bởi HTTP, không còn import DTO/domain
nội bộ của Search; controller boundary có regression suite `5/5`. Search activation state token cũng
được cung cấp qua `SearchIndexPlanTokenGenerator` port/Node adapter thay vì để action import `node:crypto`.

Layer audit sau migration: toàn bộ application controller không còn gọi trực tiếp action `.execute()`;
chỉ còn health metrics/report và development-server restart ở HTTP operational layer. Search generation
commands đã bỏ dependency trực tiếp vào `infra`, taxonomy filter coordination nhận consumer-owned port
từ filtering, và SHA-256 trong filtering/taxonomy được cung cấp qua port/Node adapter. Composition async
workflow cũng đã tách khỏi factory; module-domain và module-layer placement hiện không còn violation.

Assignment acknowledgement/clarification cũng đã được đưa về cùng boundary: hai command giữ `execute()`
cho compatibility/application callers nhưng cung cấp `executeAndWrap()`; `TaskAssignmentInteractionController`
chỉ unwrap Result. HTTP architecture test hiện fail nếu controller mới gọi trực tiếp `.execute()`, với đúng
hai allowlist exception là health/dev operational controllers.

Review confirmation cũng dùng cùng nguyên tắc: `ConfirmReviewCommand` giữ `handle()` cho application
callers hiện hữu, thêm `executeAndWrap()` cho transport boundary, và `ConfirmReviewController` unwrap
Result trước redirect. Expected `AppException` được chuyển thành `Result.fail`; lỗi ngoài dự kiến vẫn
được throw.

Review session creation cũng đã được chuẩn hóa: `CreateReviewSessionCommand` giữ `handle()` tương thích,
expose `executeAndWrap()` cho API controller, và controller unwrap Result trước khi map response `201`.

Search engine queries và search-index administration commands hiện có base local riêng (`search/actions/base_query.ts`
và `search/actions/base_command.ts`). Các action vẫn giữ `handle()` cho composition callers, nhưng expose
`executeAndWrap()` để boundary dùng canonical `Result`; expected `AppException` thành `Result.fail`, còn
unexpected infrastructure error vẫn được throw.

Notifications cũng đã gom các wrapper lặp lại vào `notifications/actions/base_command.ts` và
`notifications/actions/base_query.ts`; controller contract và `execute()` legacy/application contract
được giữ nguyên.

Skill review submission cũng đã được chuẩn hóa: `SubmitSkillReviewCommand` giữ `handle()` cho các
application caller hiện hữu, còn `SubmitReviewController` dùng `executeAndWrap()` để expected review,
permission và validation errors đi qua canonical Result boundary.

Review artifact và sprint-review package boundaries cũng đã được chuẩn hóa: evidence, self-assessment,
pending/submitted package list, package detail và user-review page controllers đều unwrap Result tại
HTTP boundary; các query/command giữ nguyên `handle()` cho compatibility callers và chỉ chuyển
`AppException` dự kiến thành `Result.fail()`.

Taxonomy governance cũng không còn là service facade mơ hồ trong `actions`: orchestration nằm trong
`TaxonomyGovernanceCommand` được expose qua inbound `TaxonomyGovernanceActionFactory`; controller chỉ
nhận capability từ container, còn command/query, repository và ID generator được wiring ở composition.
UUID được cấp qua
`TaxonomyMigrationIdGenerator`/Node adapter ở `infra`. Điều này giữ application layer không phụ thuộc
runtime API và làm module-layer gate pass mà không cần allowlist.

Filtering đã có cặp `actions/base_command.ts`/`base_query.ts`; các saved-view và filter execution query
dùng helper query local để giữ wrapper `executeAndWrap()` nhất quán mà không đổi input contract.

Users cũng có cặp `actions/base_command.ts`/`base_query.ts`; ba composite profile page query (edit, show,
view) kế thừa `BaseQuery`, giữ nguyên `execute()` cho compatibility và ủy quyền qua `handle()` để dùng
wrapper canonical ở boundary. Các query positional, static policy query và search có nested Result
được giữ ngoài base khi contract của chúng không phù hợp với generic `execute(input)`.

Projects index cũng đã kế thừa `projects/actions/base_query.ts`; query vẫn giữ `handle()` cho
composition và nhận `executeAndWrap()` từ base. Các project query không có action context hoặc dùng
zero-argument contract vẫn chưa bị ép vào base. `ConfirmReviewCommand` cũng dùng
`reviews/actions/base_command.ts`; post-commit cache effect dùng helper settlement chung của Review,
giữ nguyên nguyên tắc lỗi sau commit không làm đổi kết quả mutation.

Sprints cũng đã có cặp `actions/base_command.ts`/`base_query.ts` riêng; các command DTO và query board,
backlog, danh sách sprint kế thừa base tương ứng, còn workflow nhiều bước và hai query positional
(`detail`, `assignment history`) cung cấp wrapper explicit để giữ nguyên input compatibility. Toàn bộ
Sprints HTTP controllers hiện unwrap `executeAndWrap()` trước khi map API payload.

Tasks completion package cũng đang dùng `tasks/actions/base_command.ts` cho các command thêm/tạo/xóa
attachment, comment và submission evidence. Các command giữ transaction runner từ
`TaskExternalDependencies`, còn notification atomicity và permission checks vẫn nằm trong action.
Các query/command primitive, positional, thiếu context hoặc có choreography phức tạp vẫn được ghi nhận
để migrate theo batch riêng, không ép vào base hiện tại.

Tasks status/workflow cũng đã chuyển `CreateTaskStatusCommand`, `DeleteTaskStatusCommand`,
`UpdateTaskStatusDefinitionCommand`, `ReplaceTaskWorkflowTransitionsCommand` và
`GetTaskAuditLogsQuery` sang base local. Transaction runner, audit, cache invalidation, permission và
post-commit effects vẫn do action sở hữu; base chỉ cung cấp boundary `Result` chung.

---

# 41. Contract Result hiện tại của Suar

Suar dùng một implementation chung tại:

```text
app/modules/errors/public_contracts/result.ts
```

Contract hiện tại là:

```ts
Result<TData = void, TError = unknown>
```

API được hỗ trợ:

```ts
Result.ok(value)
Result.fail(error)
result.isSuccess()
result.isFailure()
result.data
result.error
result.getValue()
result.getError()
```

`Result` chỉ là application contract. Nó không chứa HTTP status, không serialize API response và không thay thế các exception contract trong `app/modules/errors/public_contracts`.

`getValue()` chỉ unwrap thành công. Khi Result thất bại bằng một `Error`, nó rethrow chính Error đó; khi failure là typed object không kế thừa `Error`, nó throw `InvariantViolationException`. Trường hợp typed failure phải được đọc bằng `getError()` sau khi kiểm tra `isFailure()`.

## 41.1 Quy tắc dùng trong module

Mỗi module vẫn sở hữu riêng:

```text
actions/base_command.ts
actions/base_query.ts
```

Các base class có thể import canonical `Result` từ `errors`, nhưng không được gom chung giữa các module. Duplication của base class là chủ đích để giữ module isolation.

## 41.2 Result và exception

`executeAndWrap()` chỉ chuyển `AppException` thành `Result.fail`. Unexpected error vẫn được throw để đi qua global exception handler, logging và HTTP adapter.

Vì vậy:

```text
expected application failure -> Result.fail(AppException)
unexpected/infrastructure/programming failure -> throw
HTTP rendering/serialization -> app/modules/http
```

Không dùng `Result` để bắt toàn bộ exception, không đưa HTTP concern vào `Result`, và không trộn business Result với Adonis Health `Result`.

## 41.3 Các flow đã adoption

### Marketplace module-local action bases

Marketplace hiện có riêng:

```text
app/modules/marketplace/actions/base_command.ts
app/modules/marketplace/actions/base_query.ts
```

Các facade command/query của Marketplace kế thừa base local. Những facade vốn nhận `Result` từ
`TaskApplicationFlowPort` giữ nguyên Result làm output; base không bọc thêm một lớp Result, tránh
anti-pattern `Result<Result<T, E>, E>`.

### HTTP và Observability module-local bases

HTTP và Observability cũng đã có base riêng:

```text
app/modules/http/actions/base_command.ts
app/modules/http/actions/base_query.ts
app/modules/observability/actions/base_command.ts
app/modules/observability/actions/base_query.ts
```

Các HTTP cache/identity/search/health actions và Observability UI-event command kế thừa base của
chính module đó. Những action đã có `executeAndWrap()` tiếp tục dùng canonical Result tại boundary;
base local không kéo dependency từ Errors implementation ngoài public contract và không làm nested
Result.

### Audit module-local bases

Audit hiện có base riêng cho hai chiều:

```text
app/modules/audit/actions/base_command.ts
app/modules/audit/actions/base_query.ts
```

Các write/read action của Audit kế thừa base local. `BaseWriteAuditLogCommand` vẫn là lớp policy
riêng cho critical/noncritical persistence; nó không bị thay bằng một wrapper Result chung vì audit
logging có failure semantics đặc thù và đã được kiểm thử độc lập.

### Notification commands

Các Notification command đã được chuẩn hóa dần về `app/modules/notifications/actions/base_command.ts`,
bao gồm canonical/legacy acceptance, mark-all/delete-all và projection reconciliation/promotion.
Các command vẫn giữ `execute()` và `executeAndWrap()` hiện hữu; thay đổi này chỉ bổ sung ownership
local, không bọc lại các payload Result hoặc thay đổi transaction/idempotency semantics.

### Application match score

```text
Tasks query.executeAndWrap()
  -> TasksTaskApplicationCapabilityAdapter.score()
  -> TasksMarketplaceTaskApplicationAdapter.score()
  -> Marketplace match-score query
  -> HTTP controller unwraps Result
```

Expected `AppException` được truyền trong `Result.fail`; controller unwrap và throw tại HTTP boundary để handler chung chịu trách nhiệm render response. Unexpected errors không bị biến thành Result và vẫn propagate như exception.

### Project detail

```text
GetProjectDetailQuery.executeAndWrap()
  -> GetProjectDetailApiController / ShowProjectController
  -> HTTP boundary unwraps Result
```

### Project member candidates

```text
GetProjectMemberCandidatesQuery.executeAndWrap()
  -> ListProjectMemberCandidatesController
  -> HTTP boundary unwraps Result
```

### Marketplace task applications

```text
GetTaskApplicationsQuery.executeAndWrap()
  -> TasksTaskApplicationCapabilityAdapter.listForTask()
  -> TasksMarketplaceTaskApplicationAdapter.listForTask()
  -> GetMarketplaceTaskApplicationsQuery
  -> Marketplace HTTP controller unwraps Result
```

Các method này chỉ dùng Result vì chúng có expected-failure contract rõ ràng và đã có test boundary tương ứng; không suy luận từ tên `*Result` của data projection.

### Toàn bộ application capability

Sau khi hoàn thiện read flows, ba command flows cũng dùng Result xuyên qua boundary:

```text
Tasks submit/decide/withdraw command.executeAndWrap()
  -> TasksTaskApplicationCapabilityAdapter
  -> TasksMarketplaceTaskApplicationAdapter
  -> Marketplace command
  -> HTTP controller unwraps Result
```

Application capability hiện có Result contract cho `submit`, `decide`, `withdraw`, `listForTask`, `listForCurrentApplicant`, `listForOrganization`, `score` và `rank`. Các exception expected vẫn thuộc `app/modules/errors`; controller chỉ unwrap rồi giao cho HTTP exception handler.

### Project role staffing candidates

Project API staffing candidates cũng dùng local `BaseQuery.executeAndWrap()` rồi unwrap ở controller. Đây là boundary độc lập của Projects, không kéo BaseQuery từ module khác sang:

```text
GetRoleStaffingCandidatesQuery.executeAndWrap()
  -> GetRoleStaffingCandidatesController
  -> HTTP boundary unwraps Result
```

### Profile snapshot HTTP boundaries

Các endpoint snapshot của Users dùng `BaseQuery.executeAndWrap()` tại boundary:

```text
GetCurrentProfileSnapshotQuery.executeAndWrap()
  -> current snapshot API/page controllers

GetProfileSnapshotHistoryQuery.executeAndWrap()
  -> history API controller

GetPublicProfileSnapshotQuery.executeAndWrap()
  -> public snapshot page controller
```

Expected failures vẫn được ném lại ở HTTP boundary; raw query và các orchestrator nội bộ vẫn giữ
`handle()` để không làm thay đổi contract của caller hiện hữu.

### Project member mutation

`AddProjectMemberController` dùng `AddProjectMemberCommand.executeAndWrap()` và unwrap tại HTTP
boundary. Business transaction và command `handle()` không bị thay đổi:

```text
AddProjectMemberCommand.executeAndWrap()
  -> AddProjectMemberController
  -> HTTP mutation response / exception handler
```

Remove-member và update-member dùng cùng contract tại boundary; ba command vẫn được giữ độc lập
trong module Projects.

Delete project (web và API) cũng unwraps `DeleteProjectCommand.executeAndWrap()` tại controller;
soft-delete transaction và HTTP response contract vẫn giữ nguyên.

Update project API unwraps `UpdateProjectCommand.executeAndWrap()` trước khi map response; command
vẫn trả project projection như contract cũ.

Rotate profile snapshot share-link API cũng unwraps `RotateProfileSnapshotShareLinkCommand` tại
Users HTTP boundary; lỗi snapshot không tồn tại vẫn đi qua HTTP exception handler như trước.

Update snapshot access API dùng cùng boundary contract với `UpdateProfileSnapshotAccessCommand`,
bao gồm cả việc public/private snapshot và expiry vẫn do command quyết định.

Publish profile snapshot API cũng unwraps `PublishUserProfileSnapshotCommand` tại HTTP boundary;
projection response vẫn do mapper của Users đảm nhiệm.

Profile skill add/remove/update controllers dùng `executeAndWrap()` của các command local; việc
kiểm tra skill và transaction vẫn nằm trong commands, không chuyển sang controller.

Profile details và discoverability cũng unwrap command Result tại Users HTTP boundary; response
redirect/JSON behavior hiện hữu vẫn giữ nguyên.

Recruiter bookmarks đã được đồng nhất: list query và create/update/delete/delete-by-talent đều
unwrap Result tại cùng controller boundary.

System users API dùng `GetAuthorizedUsersListQuery.executeAndWrap()` tại boundary; authorization
vẫn thuộc query, không bị chuyển vào controller.

Admin Users cũng dùng Result tại list/show/suspend/role HTTP boundaries; các mapper, redirect và
admin authorization flow vẫn nằm ngoài command/query contract.

Organizations access dùng Result cho access configuration pages (departments/roles/permissions)
và custom-role mutation; policy enforcement vẫn nằm trong query/command.

Organizations settings show/update cũng unwrap Result tại controller, giữ nguyên settings mapper,
flash message và redirect behavior.

Member candidates và pending join requests cũng dùng `BaseQuery.executeAndWrap()` tại HTTP
boundary.

`RemoveMemberCommand` là custom mutation đầu tiên được chuẩn hóa về local `BaseCommand`: `execute()`
vẫn tồn tại compatibility entrypoint, còn HTTP dùng `executeAndWrap()`.

`UpdateMemberRoleCommand` dùng `executeFromRequestAndWrap()` để giữ resolution của assignable
roles trong command; `executeFromRequest()` và `execute()` vẫn là compatibility APIs.

`InviteUserCommand` cũng dùng `executeFromRequestAndWrap()` tại HTTP boundary. Việc resolve
assignable roles, validate invitee và persist invitation vẫn nằm trong command; `executeFromRequest()`
và `execute()` tiếp tục tồn tại cho các application caller cũ.

`ProcessJoinRequestCommand` dùng local `BaseCommand` và `executeAndWrap()` tại approve/reject
HTTP boundary. Quyết định membership, audit và notification staging vẫn nằm trong cùng transaction;
compatibility `execute()` được giữ cho các integration/application caller hiện hữu.

Pending-member approval dùng Result boundary tại `ApprovePendingMemberController`; command vẫn
ủy quyền cho gateway hiện hữu, nên không thêm transaction abstraction giả vào module Members.

Bulk member add dùng `executeAndWrap()` ở HTTP boundary. Kết quả partial-success (`added`, `skipped`,
`failed`) vẫn là data của command; Result chỉ đại diện cho lỗi cấp mutation như authorization hoặc
validation, không làm mất kết quả từng user.

Accept/reject invitation cũng dùng `executeAndWrap()` tại HTTP boundary. Membership update, audit và
notification staging vẫn atomic trong command; lỗi post-commit không bị biến thành success/failure
Result mới và tiếp tục theo policy hiện hữu.

Switch organization dùng Result cho mutation HTTP có kết quả typed (`organization`, `redirectPath`).
Controller chỉ unwrap sau khi command đã kiểm tra membership, active-user và policy; session mutation
chỉ chạy sau success.

Organization directory update/delete cũng dùng Result tại API boundary. Update vẫn trả
`OrganizationRecord` cho response mapper; delete vẫn giữ `204 No Content`, còn permission, lifecycle
blocking và post-commit search/event effects vẫn thuộc command.

Organization project creation và workflow-status creation cũng unwrap Result ở HTTP boundary; typed
mutation payload tiếp tục được map bởi controller, còn gateway persistence và authorization không bị
đưa ra ngoài command.

Organization task detail query cũng dùng `executeAndWrap()` trước redirect về project task room; lỗi
expected của task reader được đưa qua HTTP exception boundary, còn logic chọn redirect vẫn ở controller.

Organization detail API và organization project-detail redirect cũng unwrap Result từ query boundary;
response mapper/redirect policy vẫn ở controller, còn membership/project authorization vẫn nằm trong
query hoặc reader.

Join organization request dùng Result tại cả JSON và HTML HTTP boundary; typed organization payload
được giữ cho JSON, còn flash/redirect legacy vẫn chỉ chạy sau khi command success.

Các entrypoint switch-and-redirect legacy/API cũng dùng cùng `executeAndWrap()` contract với switch
controller chính; session mutation chỉ xảy ra sau khi Result success.

Invitation index và member index page query cũng unwrap Result tại HTTP page boundary. Pagination,
filters và role options vẫn do page query/mapper quyết định; policy failure được đưa về HTTP exception
handler chung.

Organization creation cũng unwrap Result tại HTTP boundary; owner membership, workflow seed, audit,
welcome notification và post-commit effects vẫn thuộc command transaction/orchestration.

Organization show-page và organizations-index composite queries cũng unwrap Result ở HTTP page
boundary. Fan-out readers, pagination và review summaries vẫn do composite query quản lý; controller
chỉ map props sau success.

Tasks submission HTTP capability cũng dùng Result cho show, save-draft, submit và lock. Submission
state machine, review-session creation và notification fanout vẫn nằm trong command/query; controller
chỉ unwrap trước khi map API response.

Submission evidence index/store/delete cũng dùng Result tại HTTP boundary; evidence type/URL
validation, submission state policy và completion-package access vẫn nằm trong action layer.

Task comments list/create/update/delete cũng dùng Result tại cùng HTTP capability boundary; mention
resolution, review relevance, notification fanout và comment policy vẫn do các action đảm nhiệm.

Task attachments list/upload/create/delete cũng dùng Result tại HTTP boundary; file validation,
storage, ownership/access policy và persistence vẫn do action layer đảm nhiệm.

Task lifecycle create/delete và task detail read API/page cũng dùng Result; task authoring transaction,
delete invariants, permission calculation, cache và canonical redirect vẫn giữ nguyên ownership.

Task status/workflow CRUD và transition endpoints cũng dùng Result tại HTTP boundary. Create/update/delete/show
status, list status, update status definition, list/replace workflow, batch status update và cả legacy/v1
controllers đều gọi `executeAndWrap()` rồi unwrap tại controller. Workflow validation, atomic batch update,
audit, notification và cache invalidation vẫn thuộc action layer; Result chỉ chuẩn hóa việc đưa
`AppException` tới HTTP exception handler, còn unexpected error tiếp tục được throw.

Task sort-order mutation cũng dùng cùng boundary; command nhận một input object typed qua
`executeAndWrap()`, còn validation reorder, workflow transition, status event và post-commit cache/event
effects vẫn nằm trong command.

Task audit-log query cũng unwraps Result tại HTTP boundary. Authorization được kiểm tra trước cache,
viewer-scoped cache key và pagination vẫn do query sở hữu; controller chỉ giữ response envelope.

Task grouped-board và timeline queries cũng dùng Result tại API boundary; permission filter, user-scoped
cache generation và projection mapping vẫn nằm trong query.

Task index-page query cũng unwraps Result trước khi page props/redirect/session logic chạy; project
selection, pagination, permission decisions và Inertia shell behavior không bị chuyển vào Result hay
HTTP controller.

Task time-tracking mutation cũng unwraps Result tại HTTP boundary; DTO validation, permission,
transactional audit và post-commit task event/cache effects vẫn do command quản lý.

Task edit-page composite query cũng unwraps Result trước khi compatibility redirect; task detail,
metadata, edit policy và redirect target vẫn do page/query/controller hiện tại quản lý.

Task update mutation dùng local `BaseCommand.executeAndWrap()` tại cùng controller boundary; versioning,
authorization, audit, notification và transaction vẫn nằm trong command.

Task create-permission query cũng unwraps Result ở API boundary; `PolicyResult` success decision vẫn
giữ nguyên (`canCreate`, reason, code), còn lỗi application kỳ vọng đi qua global exception handler.

Task requirement creation v1 endpoint cũng dùng `executeAndWrap()` sau Vine validation; HTTP error
mapping vẫn ở boundary adapter, còn requirement duplicate/level/rubric rules và transaction vẫn thuộc
command.

Các requirement v1 còn lại — update, version list, role prefill và remove — cũng dùng Result boundary;
Vine validation/response projection vẫn giữ ở controller, còn level/rubric/category invariants và
transaction vẫn do action sở hữu.

Skills read boundaries cũng được chuẩn hóa: project skills/roles workspace queries và published/list
rubric queries đều dùng `executeAndWrap()` trước khi controller map camelCase payload; authorization,
rubric resolution và projection detail vẫn giữ ở Skills action layer.

Skills proficiency-scale (active/show) và professional-role-template reads cũng unwraps Result trước
camelCase mapping; empty active-scale behavior vẫn giữ nguyên như trước.

Skills project-skill add/update/deactivate mutations cũng dùng workspace command `executeAndWrap()`;
project authorization, audit và persistence vẫn nằm trong workspace/action command, response mapper chỉ
chạy sau success.

Các mutation Skills còn lại — create role, deactivate role/role target và upsert role skill — cũng dùng
workspace Result boundary; nhánh add/update role-skill và 204 response vẫn giữ nguyên semantics.

Sáu workspace write command của Skills hiện dùng chung `AuthorizedSkillProjectWrite<TInput, TOutput>`,
kế thừa `skills/actions/base_command.ts`; wrapper `executeAndWrap()` không còn lặp ở từng command.
Superclass chỉ sở hữu authorization context và boundary Result, còn command con vẫn sở hữu việc gọi
use case, validation và audit payload.

Projects create-page composite query cũng unwraps Result tại page boundary; ownership lookup,
organization-member options và status metadata vẫn do query quản lý, Inertia render chỉ chạy sau success.

Notifications feed query và các mutation HTTP (mark one/all as read, delete one/all read) cũng dùng
`executeAndWrap()` ở cả Inertia và API v1 controllers. Authorization/not-found errors của notification
được chuyển thành `Result.fail` rồi unwrap tại HTTP boundary; logging, repository ownership và feed
pagination vẫn do action layer giữ nguyên, còn unexpected infrastructure errors tiếp tục throw.

Reviews dispute comments/evidences và admin case-file list/build cũng dùng Result ở HTTP boundary.
Dispute participant/admin authorization, artifact persistence, snapshot normalization và audit vẫn ở
action layer; controller chỉ unwrap sau action thành công.

Reviews dispute lifecycle report/respond/resolve cũng unwrap Result tại HTTP boundary. State transition,
readiness checks, transaction, audit và notification/event effects vẫn thuộc command; controller không
di chuyển business policy sang lớp HTTP.

Classic dispute create và admin/org dispute list/detail cũng dùng Result boundary; pagination cursor,
system-admin/organization policy, nested artifact composition và response mapping vẫn do query/command
own, còn controller chỉ unwrap trước khi tạo envelope.

Sprint reverse-review và task-review workflow mutations (submit, respond, accept, report) cũng dùng
Result tại page/redirect boundary. Workflow state machine, participant authorization, transaction,
notification và AI-dispute staging vẫn thuộc command; redirect chỉ chạy sau khi Result success.

AI dispute evaluation list/start và public callback cũng dùng Result boundary. Signature/TTL validation,
idempotency, source transition, external trigger và evaluation persistence vẫn nằm trong action; HTTP
controller chỉ unwrap kết quả sau khi command/query hoàn tất.

Sprint review package lifecycle (close review/period, submit, expire) và sprint-review dispute
create/report cũng dùng Result tại HTTP boundary; transaction, reviewer/manager policy, package state,
dispute creation và AI staging vẫn do commands sở hữu.

Task-review submit/accept và sprint-review dispute comment cũng đã dùng Result; reviewer quorum,
workflow completion, participant policy, notification và audit vẫn nằm trong action layer, redirect/API
mapping chỉ chạy sau success.

Reviews task/sprint board reads, review evidences, self-assessment và review observation creation cũng
dùng Result ở HTTP boundary; project visibility, evidence access, observation governance, session policy
và workspace transition vẫn thuộc query/command, còn Inertia/API mapping chỉ chạy sau success.

HTTP Redis cache controllers cũng unwrap Result từ set/clear/flush/get/list cache actions; strict
superadmin gate, key validation, audit và cache-store side effects vẫn ở action layer, còn 204/JSON
transport semantics không đổi.

HTTP identity/organization member controllers cũng unwrap Result từ `GetMe`, organization-members và
users-in-organization queries; authentication/organization membership lookup vẫn thuộc query/HTTP
boundary, còn legacy/v1 response mapping chỉ chạy sau success.

HTTP global search và search-discovery controllers cũng unwrap Result; search-specific diagnostic errors
vẫn được mapping riêng thành canonical HTTP exceptions, còn retrieval, cursor và scope policy vẫn do
Search public contract/action sở hữu.

Auth landing, logout, session issue/refresh và social-auth callback controllers cũng dùng Result
boundary; token binding, OAuth callback policy, session revocation, redirect semantics và durable auth
events vẫn do auth commands/queries sở hữu, còn controller-specific Problem Details/redirect mapping
không đổi.

Users profile edit/show/view và invitations page cũng unwrap Result từ composite page queries; profile
authorization, skill/review/work-history fan-out, invitation pagination và Inertia props vẫn do query
layer sở hữu.

Filtering query controllers (criteria execution, saved-view list/show/execute và alert read) cũng dùng
Result boundary trong khi custom filter diagnostics/access errors vẫn được adapter mapping riêng. Context
authorization, permission constraints, optimistic locking và provider execution vẫn thuộc Filtering action.

Sprint commands (create/update/start/end delivery, move task và backlog reorder) cũng unwrap Result tại
HTTP boundary; project-sprint authorization, transaction locking, task destination rules và lifecycle
invariants vẫn thuộc Sprint commands.

Testing auth fixture/token/bootstrap controllers, authorization access resolution và required-organization
error page cũng dùng Result boundary. Health metrics/report và development-server restart được giữ là
operational projection/process-control trực tiếp vì không có application error result contract.

Nếu implementation cho phép lấy `value` khi failed, lỗi sẽ xuất hiện muộn.

Discriminated union giúp buộc kiểm tra:

```ts
if (!result.ok) {
  // handle
}

return result.value;
```

---
