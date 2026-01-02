# System Structure Components

| Tầng       | Diagram                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview   | `component_01_modular_monolith`                                                                                                                                                                                     |
| High level | `component_02` core map → `component_02a..02d` contract slices; `component_03` platform map → `component_03a` event map → `component_03a1/03a2` publisher/consumer slices, plus `component_03b..03d` support slices |
| Low level  | `component_04` seam map → `component_04a` consumer port, `04b` versioned contract/event, `04c` composition factory boundary                                                                                         |

Không có file nào ở đây chỉ đóng vai trò “ví dụ minh họa”:

- `component_01` là bản đồ vào cửa, nhóm source module thành logical component;
- `component_02` chỉ là core capability map; `02a` Project/Sprint, `02b` Task, `02c` Marketplace và `02d` Review giữ contract dependency riêng;
- `component_03` chỉ là platform responsibility map; `03a` là event reading map, `03a1` chỉ giữ publisher contracts, `03a2` chỉ giữ consumer reactions; `03b` accountability, `03c` query/cache runtime và `03d` operational support tiếp tục tách riêng;
- `component_04` chỉ là integration-pattern index; `04a` consumer port, `04b` versioned
  contract/event và `04c` composition factory boundary mỗi file chỉ giải thích một seam.

Transitional direct-internal dependency view đã bị xoá sau khi guarded baseline về zero. Current
diagram không giữ architecture debt đã được retire như thể nó còn là runtime.

Quy tắc đọc: mở file không suffix trước. Chỉ xuống file `a/b/c/d`, rồi `a1/a2` khi có, đúng concern cần xem. Không ghép các detail view lại thành một dependency mega-graph.

Các view này bổ sung cho 20 Package diagrams: Package trả lời folder/layer nào phụ thuộc folder/layer nào, còn Component trả lời đơn vị trách nhiệm nào cung cấp hoặc yêu cầu interface nào.

Không đọc các component như process hoặc microservice độc lập. Suar vẫn là một modular monolith và các component cùng chạy trong một application process.
