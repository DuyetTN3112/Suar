# Diagram Narrative Map

| Field           | Value                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| Status          | Active                                                                                |
| Purpose         | Connect focused diagrams into complete, report-readable architecture stories         |
| Audience        | Report reader, lecturer, reviewer, new joiner, developer                             |
| Source of truth | Family/domain README files, canonical diagram sources, verified code/schema/routes    |

## Narrative Contract

Splitting is justified only when it makes one question readable in one frame. A split set remains
complete through an explicit narrative contract:

1. **Entry:** one overview establishes actors, boundary, scope, and vocabulary.
2. **Focus:** each high-level or low-level diagram answers one question or scenario.
3. **Handoff:** the parent README names the record, identifier, state, or boundary that carries the
   reader into the next diagram.
4. **Outcome:** the final diagram or paragraph states the authoritative business result.
5. **Stop condition:** the reader can stop as soon as their question is answered; they do not need
   to open every sibling diagram.

Diagram filenames, headings, captions, and source headers keep stable identifiers. Cross-diagram
navigation belongs in README/report prose so the rendered canvas stays uncluttered.

## Notation and Decomposition Contract

The gallery does not assign arbitrary ``levels'' to UML. It uses a notation only when that notation
answers a different technical question. The relationship between views is explicit:

| Question | Required viewpoint | Handoff to the next technical view |
| --- | --- | --- |
| Who is outside the solution boundary and what data crosses it? | DFD Level 0 / use-case system boundary | External-entity ID, system boundary, and named data flow |
| Which system process owns each major transformation? | DFD Level 1 complementary frames `dfd_01a`--`dfd_01d` | Parent process number, input/output flows, material data stores, and explicit D2/H1/H2 cross-frame handoffs |
| How is one numbered process decomposed? | DFD Level 2 or primitive Level 3 | Child process numbers that retain the parent prefix and balanced flows |
| Which entities, keys, and cardinalities preserve the result? | Conceptual then logical ERD | `PK` / `FK` columns and exact `child.fk -> parent.pk` reference |
| Which software responsibilities collaborate to implement a use case? | UML design class diagram | Class/interface names and operations used as sequence participants/messages |
| In what order do those responsibilities exchange messages? | UML sequence diagram | Actor, scenario result, and any identifier/state passed onward |
| Which stable states and transitions constrain the result? | UML state machine | Event, guard, authoritative terminal state |

The reader follows a parent process number, a record identifier, or a design-class responsibility;
not a folder name. `overview`, `high-level`, and `low-level` are repository navigation tiers only.

## Architecture Story

| Order | Diagram | Question answered | Handoff to the next view |
| ----: | ------- | ----------------- | ------------------------ |
| 1 | `arch_01_system` | Who uses Suar, and which systems are outside its boundary? | Suar application boundary plus named external dependencies |
| 2 | `component_01_modular_monolith` | Which logical components live inside that boundary? | HTTP/application modules, PostgreSQL, Redis, search, workers |
| 3 | `arch_02_layer` | Which layer owns transport, intent, policy, and I/O? | One Command/Query as the use-case owner |
| 4 | `arch_02a_request_flow` | How does one request cross those layers? | Result and committed authoritative state |
| 5 | `arch_02b_composition_boundary` | How are use cases constructed without moving workflow into composition? | Inbound factory contract and injected outbound ports |
| 6 | `deployment_01_reference_topology` | Which declared runtime processes and data services execute the system? | HTTP process, worker processes, PostgreSQL and Redis |

Split justification: system context, logical components, code ownership, request execution,
construction, and deployment are different questions and use different notation. Repeating the
same component and dependency names makes their relationship traceable without building one
unreadable architecture canvas.

## Work-to-Evidence Story

| Order | Diagram | Question answered | Handoff to the next view |
| ----: | ------- | ----------------- | ------------------------ |
| 1 | `act_01_task_management_overview` | Where does submission sit in the task lifecycle? | Assigned task ready for a completion package |
| 2 | `logical_erd_03b_requirements_submission` | Which records preserve the accepted contract and evidence, and which FK reaches each parent key? | `task_assignment_id`, `task_submission_id`, evidence rows |
| 3 | `cls_02l1_task_submission_inbound_composition` | How does the HTTP boundary construct the authorised task-submission command for UC 02b? | `SubmitTaskSubmissionCommand`, the explicit shared responsibility in the next view |
| 4 | `cls_02l2_task_submission_command_collaborators` | Which port group supplies the authoritative transaction and persistence write? | Committed submission coordinated by the same command in the next view |
| 5 | `cls_02l3_task_submission_review_handoff` | Which governed port creates the review session and determines its audience? | The same command stages notification work in the next view |
| 6 | `cls_02l4_task_submission_notification_staging` | Which port stages accountable notification fan-out for later durable delivery? | Design-class responsibilities used as sequence lifelines |
| 7 | `seq_02e_task_submission_review_handoff` | In what order do those responsibilities own transaction, policy, audit, fan-out staging, and review handoff? | Committed submission plus review-session identifier |
| 8 | `state_02b_task_review_workflow` | What lifecycle receives the submitted package? | Accepted or resolved review outcome |

Split justification: logical data structure, inbound composition, authoritative commit, review
governance, notification staging, and runtime ordering are independent concerns.
`SubmitTaskSubmissionCommand` is deliberately repeated between the four design-class views as their
handoff; shared submission, assignment, and review-session identifiers then provide continuity
between ERD, design classes, sequence, and state views.

## Marketplace-to-Assignment Story

| Order | Diagram | Question answered | Handoff to the next view |
| ----: | ------- | ----------------- | ------------------------ |
| 1 | `act_02_marketplace_overview` | How does an opportunity move from discovery to a decision? | Selected task and authenticated applicant |
| 2 | `comm_02_marketplace_apply` | How does the application intent cross Marketplace and Tasks boundaries? | Pending `task_applications` record |
| 3 | `logical_erd_03c_marketplace_application` | How are proposal and assignment kept as separate records? | Approved proposal creates assignment as a command side effect |
| 4 | `state_03_task_application` | Which decisions can change application state? | Approved, rejected, or withdrawn outcome |

Split justification: communication ownership, persistence relationships, and lifecycle rules use
different notations. `taskId`, applicant identity, and application identity are the handoff keys.

## Dispute-to-Human-Decision Story

| Order | Diagram | Question answered | Handoff to the next view |
| ----: | ------- | ----------------- | ------------------------ |
| 1 | `arch_07_ai_dispute_integration` | Which system owns the case, advice, callback, and final decision? | Immutable case/evaluation identity |
| 2 | `logical_erd_04b_dispute_ai` | Which records form the evidence dossier and advisory result, and which FK reaches each parent key? | `dispute_id`, `case_file_id`, `evaluation_id` |
| 3 | `cls_03k1_ai_dispute_inbound_composition` | How does an administrator HTTP request construct the authorised AI-evaluation command? | `StartAiDisputeEvaluationCommand`, the shared responsibility in the next view |
| 4 | `cls_03k2_ai_dispute_source_context` | Which port supplies governed role, dispute, and case-file context? | The same command stages and dispatches through the gateway view |
| 5 | `cls_03k3_ai_dispute_gateway_dispatch` | Which port stages, dispatches, and reconciles a fenced evaluation? | Design-class responsibilities used by the dispatch sequence |
| 6 | `seq_04d_ai_dispute_evaluation_dispatch` | How is one administrator-requested evaluation validated, staged, audited, and immediately dispatched? | Durable evaluation, stable callback identifiers, and dispatch state |
| 7 | `cls_03l_ai_dispute_callback_runtime_design` | Which technical boundary, control, cryptography, and unit of work collaborate at callback time? | Design-class responsibilities used by the callback sequence |
| 8 | `seq_04e_ai_dispute_callback` | How is the callback authenticated and persisted atomically? | Terminal advisory result; source returns to human review |
| 9 | `seq_04c_review_dispute_admin_resolution` | How does the administrator write the authoritative result? | Resolved dispute plus durable resolved event |

Split justification: inbound construction, governed source context, fenced dispatch, callback, and
resolution have different responsibilities, trust boundaries, transactions, and failure semantics.
`StartAiDisputeEvaluationCommand` is deliberately repeated between the three dispatch class views;
the three stable identifiers and the `ai_reviewing` → human-review handoff then connect the focused
views without falsely suggesting one synchronous call.

## Accountability and Delivery Story

| Order | Diagram | Question answered | Handoff to the next view |
| ----: | ------- | ----------------- | ------------------------ |
| 1 | `arch_02c_event_side_effects` | Which effects belong inside the business transaction? | Durable event/fan-out/outbox work |
| 2 | `logical_erd_05a_notifications` | Which notification record is authoritative? | Persisted notification and recipient work |
| 3 | `arch_04a_durable_observability` | Which operational evidence is durable? | Audit and workflow evidence in PostgreSQL |
| 4 | `logical_erd_05b_durable_observability` | How are auth receipts, audit events/scopes, and errors related? | Traceable operational record |
| 5 | `deployment_01_reference_topology` | Which worker processes project committed work? | Rebuildable cache/search/realtime outputs |

Split justification: transaction semantics, relational ownership, observability, and physical
runtime topology answer different review questions. The durable job/event identifiers and
PostgreSQL boundary connect them.

## Report Selection Rule

For one report subsection, select the viewpoint needed to substantiate the technical claim, then
state its parent/child or structure/behaviour relationship in prose. A context view does not replace
a DFD decomposition; a class diagram does not replace a sequence; and a conceptual ERD does not
replace a logical ERD with keys. Additional figures belong in an appendix only when they are
necessary decompositions, exceptions, or verification views of an identified parent model.

Every report figure therefore has a notation, a scope, an entry point, and a handoff. Consecutive
figures without an explicit model relationship fail the narrative gate.
