Tôi cần tạo một thứ mới →

1. Có chứa DB query/write?
   → infra/ (repository)
   Ngoại lệ: nếu nó dùng chung bởi nhiều commands VÀ có business semantics rõ
   → services/ (application service)

2. Là pure business rule, không side-effect?
   → domain/ (policy, formula, rule)

3. Là adapter cho external system (OAuth, payment, email, S3)?
   → infra/ (gateway/adapter)

4. Là infrastructure concern (cache, logging, config, concurrency)?
   → infra/ hoặc libs/

5. Là một use case độc lập, có thể được trigger từ nhiều nơi?
   → actions/ (sub-command hoặc query)

6. Không thuộc gì trong trên, được dùng chung bởi nhiều commands,
   có business semantics, không thể đặt vào domain vì cần I/O?
   → services/ (application service — đây là nơi duy nhất hợp lệ)
