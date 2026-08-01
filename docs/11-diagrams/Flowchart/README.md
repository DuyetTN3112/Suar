# Flowchart Notation Index

`flowchart` đã có trong repo và đang là cú pháp Mermaid phổ biến nhất: 265 source `.mmd` hiện dùng keyword này.

Đây không phải một semantic family độc lập trong catalog. Cùng một renderer đang phục vụ nhiều câu hỏi khác nhau; folder chứa source quyết định semantics và quality gate:

| Khi cần trả lời | Family nên mở | Ví dụ |
|---|---|---|
| Các bước, decision và guard của một control flow | UML Activity (`Action/`) | [`act_02b_marketplace_apply`](../Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd) |
| Hành trình từ góc nhìn người dùng | `UserFlow/` | [`uf_02_marketplace_task_application_journey`](../UserFlow/02-marketplace/overview/uf_02_marketplace_task_application_journey.mmd) |
| Process, external entity, store và data flow | `DFD/` | [`dfd_00_context`](../DFD/00-system-overview/overview/dfd_00_context.mmd) |
| Actor và goal trong system boundary | `Usecase/` | [`uc_01_auth_org`](../Usecase/01-auth-organization/overview/uc_01_auth_org.mmd) |
| Block/capability/runtime relationship | `Architecture/`, `Package/`, `RichPicture/` | [`arch_01_system`](../Architecture/01-system-architecture/overview/arch_01_system.mmd) |

## Chọn flowchart hay loại khác

- Dùng flowchart tổng quát khi chỉ cần diễn tả một process/algorithm dễ đọc và không cần notation chặt hơn.
- Dùng Activity khi action, decision/guard, fork/join hoặc responsibility lane là trọng tâm.
- Dùng BPMN khi business process cần participant/pool, event, gateway và message flow chuẩn.
- Dùng State Machine khi câu hỏi là object đang ở state nào và event nào làm nó chuyển state.
- Đừng tạo bản sao `Flowchart/` của một diagram đã nằm đúng family; điều đó làm coverage bị đếm hai lần và hai source dễ lệch nhau.

Mermaid 11.16.0 có renderer native cho Flowchart và State Diagram, nhưng không có renderer native cho UML Activity hoặc BPMN. Vì vậy Activity hiện dùng Mermaid `flowchart`, còn BPMN dùng source XML `.bpmn` và renderer BPMN chuyên dụng.
