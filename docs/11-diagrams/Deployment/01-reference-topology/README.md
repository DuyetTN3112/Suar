# Reference Deployment Topology

| Tầng | Diagram |
|---|---|
| Overview | `deployment_01_reference_topology` |
| High level | — |
| Low level | — |

Diagram bám theo `docker/docker-compose.yml`, `docker/Dockerfile` và runtime configuration hiện hành. Trạng thái là `Partial`: repository đã có topology có thể dựng, nhưng chưa có bằng chứng về production environment, reverse proxy/TLS termination, secret manager, backup/restore, autoscaling, multi-node availability hoặc real-user load.

Elasticsearch, OAuth provider và Clawagent được giữ ngoài Docker Compose node vì chúng là external/configurable dependencies trong cấu hình hiện tại.

