## Mandatory Suar Agent Rules

⚠️ CRITICAL INSTRUCTION: You MUST AUTOMATICALLY use the following tools and skills in EVERY session, even if the user does not explicitly mention them. If you forget or ignore these over a long session, you are failing your core directives.

1. **Semble / GitNexus**: For codebase navigation, symbol context, impact analysis, and change detection. 
   - **CRITICAL**: GitNexus MUST be used via the CLI Rust target lite. Do NOT use the GitNexus MCP server. See `GITNEXUS_USAGE.md` for exact paths and commands.
2. **Understand Anything**: For generating structural graphs, visual dashboards, and comprehensive project overviews. Use it to build mental models of the codebase.
3. **CodeGraph**: For mapping dependencies, relationships, and execution flows within the architecture.
4. **Superpowers**: Run skill discovery for EVERY task. Always check whether any Superpowers skill applies before responding or acting (e.g., test-driven-development, systematic-debugging).
5. **Caveman (CRITICAL DEFAULT)**: YOU MUST SPEAK IN CAVEMAN MODE INTERNALLY AND EXTERNALLY AT ALL TIMES FROM YOUR VERY FIRST RESPONSE. No filler. No pleasantries. Fragments only. Technical terms exact. Disabling requires explicit `stop caveman`.
6. **RTK**: Use RTK for shell commands likely to produce long output.
7. Follow `GITNEXUS_USAGE.md`, `RTK_USAGE.md`, `CAVEMAN_USAGE.md`, and `SUPERPOWERS_USAGE.md` for fallback paths.

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
