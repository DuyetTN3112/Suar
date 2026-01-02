# UML Component Diagram Gallery

Source of truth là PlantUML `.puml`; preview `.png` có cùng basename để xem trực tiếp. Family này dùng UML component semantics để mô tả ranh giới module, interface và dependency tĩnh. Nó không thay cho runtime flow trong `Sequence/` hoặc topology trong `Deployment/`.

Coverage của family được chia theo bốn câu hỏi khác nhau, không coi một hình overview là đủ:

1. toàn hệ thống có những logical component nào;
2. core capability phụ thuộc public contract nào;
3. platform capability cung cấp interface nào và phản ứng event ra sao;
4. consumer-owned port và composition factory giữ dependency direction như thế nào.

Các source dùng ELK layout để ưu tiên connector vuông góc, đủ lề và ổn định khi render. Render bằng PlantUML `1.2026.3`:

```bash
java -Djava.awt.headless=true \
  -jar /path/to/plantuml-1.2026.3.jar \
  -tpng \
  docs/11-diagrams/Component/01-system-structure/{overview,high-level,low-level}/*.puml
```

## 01 — System Structure

### `component_01_modular_monolith`

![Suar modular monolith UML component diagram](01-system-structure/overview/component_01_modular_monolith.png)

### `component_02_core_domain_dependencies`

![Core capability component dependencies](01-system-structure/high-level/component_02_core_domain_dependencies.png)

#### `component_02a_project_sprint_dependencies`

![Project and sprint required contracts](01-system-structure/high-level/component_02a_project_sprint_dependencies.png)

#### `component_02b_task_dependencies`

![Task required contracts](01-system-structure/high-level/component_02b_task_dependencies.png)

#### `component_02c_marketplace_dependencies`

![Marketplace required contracts](01-system-structure/high-level/component_02c_marketplace_dependencies.png)

#### `component_02d_review_dependencies`

![Review required contracts](01-system-structure/high-level/component_02d_review_dependencies.png)

### `component_03_platform_services`

![Platform services component view](01-system-structure/high-level/component_03_platform_services.png)

### `component_03a_domain_event_reactions`

![In-process domain event reactions](01-system-structure/high-level/component_03a_domain_event_reactions.png)

#### `component_03a1_domain_event_publishers`

![Versioned domain event publishers](01-system-structure/high-level/component_03a1_domain_event_publishers.png)

#### `component_03a2_domain_event_consumers`

![In-process domain event consumers](01-system-structure/high-level/component_03a2_domain_event_consumers.png)

#### `component_03b_accountability_services`

![Accountability services](01-system-structure/high-level/component_03b_accountability_services.png)

#### `component_03c_query_runtime`

![Query and cache runtime dependencies](01-system-structure/high-level/component_03c_query_runtime.png)

#### `component_03d_operational_context`

![Operational support context](01-system-structure/high-level/component_03d_operational_context.png)

### `component_04_integration_seams`

![Current and preferred cross-module integration seams](01-system-structure/low-level/component_04_integration_seams.png)

#### `component_04a_consumer_owned_port`

![Consumer-owned port and provider adapter](01-system-structure/low-level/component_04a_consumer_owned_port.png)

#### `component_04b_versioned_contract_event`

![Versioned public contract and domain event seam](01-system-structure/low-level/component_04b_versioned_contract_event.png)

#### `component_04c_composition_factory_boundary`

![Composition factory boundary](01-system-structure/low-level/component_04c_composition_factory_boundary.png)
