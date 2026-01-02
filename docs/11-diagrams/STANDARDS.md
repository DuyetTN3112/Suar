# Diagram Standards

| Field           | Value                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Status          | Active — mandatory for every diagram rebuild                                                             |
| Source of truth | Course notation rules, current routes/code, `docs_AI/suar.sql`, current migrations, audited requirements |

## Evidence Status

Every diagram must declare one status in its header:

- `Implemented`: route/runtime and persisted data are verified.
- `Partial`: usable runtime exists, but stated capability is incomplete.
- `Planned`: design direction only; never present it as current behavior.
- `Legacy`: compatibility behavior still present in current code/runtime; removed behavior must be deleted, not diagrammed.

One file must not mix statuses without marking the affected node or path.

## Report Readability Gate

- Target canvas: one A4 page, portrait or landscape according to content.
- Target `width:height` aspect ratio: `0.75:1` to `4:1`.
- Hard review threshold: aspect ratio over `4:1` or under `0.75:1`.
- Overview: `3-7` primary concepts.
- Detail: exactly one concern or one scenario.
- Text must remain readable when image is fitted to one report page at 100%.
- Choose page orientation from final fitted readability, not from a mandatory landscape rule.
- A horizontal L-shaped route is allowed for flow, DFD, communication, and architecture diagrams when it reduces crossings and long return wires.
- Sequence lifelines stay vertical; reduce width by splitting scenarios, never by bending time.
- Every diagram needs a stable identifier, but the canvas must not repeat the surrounding report heading. In this gallery, filename, README heading, figure caption, and source header provide the diagram name.
- Do not embed an overall decorative title in the rendered PNG. Keep notation-required semantic labels such as pool, lane, package, system boundary, state region, decision, or component names.

## Connector Routing and Layout Discipline

Connectors are part of the model semantics, not free decoration. Every technical diagram must use
one deliberate reading direction and a stable layout before labels are added.

- Put sources/actors at the entry edge, transformations or collaborating elements in the centre,
  and stores, external receivers, or authoritative results at the exit edge. Use top-to-bottom only
  when time or decomposition is the primary reading direction.
- Draw the primary path in one direction. A return, exception, or acknowledgement uses a distinct
  outer or lower lane; it must not cut back through the main path.
- DFD, architecture, component, package, class, and communication connectors use orthogonal
  routing where the renderer supports it. Sequence lifelines remain vertical and time never bends.
- Each connector expresses one relation or one named data flow. Put its label adjacent to that
  connector, never on a crossing, and do not merge unrelated payloads into an ambiguous arrow.
- A visible connector crossing fails review. Re-rank nodes, use a same-boundary repetition only
  when notation permits it, or split by concern; never accept a crossing merely because the graph
  renderer produced it.
- Repeated DFD source/sink or store symbols may be used solely to remove a return wire. They must
  repeat the same stable identifier and say `same external entity` or `same store` in the label.
- Do not use invisible layout links as semantic relations. If they are needed to stabilise a
  renderer, keep them between adjacent layout peers and document the actual relation with a
  visible labelled connector.

## Viewpoint Hierarchy

Every report-facing diagram must live below a domain folder and one of three easy-to-scan reading tiers:

```text
<family>/<domain>/
├── overview/    # entry point: system/domain/lifecycle map
├── high-level/  # primary business workflow or major structural slice
└── low-level/   # atomic scenario, guard, exception, mapping or physical detail
```

- Tier names describe reader depth, not formal UML levels. UML diagrams are identified by notation
  and viewpoint: for example, use-case scope, conceptual class structure, design class structure,
  interaction scenario, state machine, package boundary, component boundary, or deployment.
- DFD source headers and report captions must declare the formal decomposition level and parent
  process identifier. The folder tier never substitutes for `Level 0`, `Level 1`, `Level 2`, or a
  primitive lower-level DFD.
- Every Mermaid `.mmd`, BPMN `.bpmn`, PlantUML `.puml`, or DMN `.dmn` source and matching `.png` pair stays in the same tier folder.
- A domain may omit an empty tier; do not add placeholder diagrams merely to make all three folders non-empty.
- Domain README maps overview -> high-level -> low-level when the filename hierarchy alone is not obvious.
- Split a diagram when it contains two independently explainable stories, crosses concerns, or fails one-page readability. Name split files by business meaning, never `part1`/`part2`.
- After splitting, remove duplicated old content or reduce the old file to a genuinely useful compact navigation map.

## One File, One Diagram Gate

A rendered PNG must look like one diagram, not several separately framed diagrams assembled on one canvas.

For every `subgraph`, panel, numbered row, boxed phase, or visually isolated region, ask:

> Can this region be understood as a useful diagram with its own purpose, input, and outcome?

- If yes, move it into its own semantic-named source and `.png`; never name it `part1` or `part2`.
- Separate numbered phases, independent journeys, independent operational pipelines, and layout-only rows normally become separate files.
- A `subgraph` used only to force Mermaid layout must not render as a bordered panel. Split it or remove its visible frame.
- Keep multiple regions only when the notation requires one coherent semantic boundary: UML system boundary, actor swimlane, package/container/layer boundary, ERD relationship context, or Sequence `alt`/`opt`/`loop` fragment.
- A kept region must participate in the same single question answered by the whole diagram; visual proximity alone is not enough.
- Family/domain README must list split siblings and their reading order.

## Cross-Diagram Narrative Gate

A readable split is complete only when the parent family/domain README or
[`NARRATIVE-MAP.md`](NARRATIVE-MAP.md) records:

1. the overview entry point;
2. the single question answered by each child;
3. the stable record, identifier, state, actor, or boundary handed to the next child;
4. the authoritative outcome and stop condition;
5. the notation/viewpoint used by the child and why that question cannot be answered by the parent;
6. for DFD, the parent process identifier and balanced input/output flows;
7. the reason separate files are more legible or semantically correct than one canvas.

Use the same canonical vocabulary across the chain. A handoff may repeat a small set of identifiers
or component names, but it must not duplicate the whole parent diagram. Navigation belongs in
README/report prose rather than decorative boxes on the canvas.

For report-facing chains, prose must introduce why the next figure is needed. Consecutive figures
without a stated handoff fail the narrative gate even when each image is individually correct.

## Traceability Gate

Traceability uses two layers:

1. every source file declares `Evidence status` in its header;
2. [`TRACEABILITY.md`](TRACEABILITY.md) maps capability requirements to runtime evidence and diagram families;
3. family galleries map overview/detail hierarchy and every report-facing source;
4. a diagram-specific caveat or planned path stays in that source header.

Do not duplicate the same requirement, route list, and related-diagram chain across every file. Central ledger is authoritative; source headers carry only status and diagram-specific evidence boundaries.

Required chain for a core capability:

```text
Requirement -> Use Case -> Activity/BPMN -> Sequence -> Domain/Class + Data/ERD -> State (when lifecycle exists)
```

BPMN is required only when participant-to-participant business coordination is material. Activity remains the default for a bounded control flow.
DMN is added only when a material business decision has explicit inputs, outputs, and stable rules; it complements rather than replaces Activity/BPMN.

Family presence is not satisfied by one sample file. Coverage is sufficient only when each materially different viewpoint or core capability that needs that notation is represented, while avoiding duplicate diagrams that answer the same question. File count alone is neither a completion gate nor a reason to manufacture planned behavior.

## Rich Picture

- Show problem situation, stakeholders, system/environment boundary, information channels, concerns, conflicts, and uncertainty.
- No class, controller, repository, route, or table inventory.
- Ad-hoc visual notation is valid; a hierarchy-only mind map is not.

## Use Case

- Actor means external role, not database role or internal service.
- Use case means complete actor-valued goal and uses verb-object naming.
- Actor association is an undirected association.
- Use only UML `<<include>>`, `<<extend>>`, and generalization semantics.
- Keep implementation detail outside system boundary.
- Overview target: at most `7-9` use cases; split by actor goal when larger.

## Flowchart Syntax

- Mermaid `flowchart` is a rendering syntax, not a semantic family by itself.
- A `.mmd` using `flowchart` must still obey the family rules of its folder: Activity, User Flow, DFD, Use Case, Architecture, or another declared family.
- Use a generic flowchart only when the question is a general process/algorithm and no stricter notation adds useful meaning.
- Do not duplicate an existing semantic diagram solely to create a second copy labeled `Flowchart`.

## Activity

- Folder remains `Action/` for path compatibility; content is UML activity semantics.
- Show initial/final node, actions, decisions with guards, merge/fork/join when needed.
- Use swimlanes when responsibility crosses two or more actors/systems.
- Business activity and implementation pipeline must live in separate files.

## BPMN

- Source of truth is valid BPMN 2.0 XML with extension `.bpmn`; the same-basename `.png` is the report preview.
- Put evidence status, review date, scope, and runtime caveats in `bpmn:documentation` and the family/domain README.
- Use a collaboration only when participant boundaries matter. Pool/participant names identify accountable parties; lanes subdivide responsibility inside one participant.
- Sequence flow stays inside one participant. Message flow crosses participant boundaries. Never use message flow as an ordinary control-flow arrow.
- Events represent triggers/results, tasks represent work, and gateways represent routing semantics. Name each element with business language.
- One file answers one end-to-end business-process question and must still pass the one-page readability gate.
- A collaboration overview may use black-box pools and numbered message flows when internal control flow is already covered by Activity/Sequence. Do not duplicate every guard, persistence step, and retry loop inside that overview.
- If message flows overlap sequence flows or one pool must span several unrelated stages, keep the participant overview and move internal control flow to the existing Activity/Sequence detail.
- Do not claim executable orchestration merely because the XML is syntactically executable-capable; report-facing models default to `isExecutable="false"`.
- Render with the pinned command documented in `BPMN/README.md`; do not redraw the PNG manually.

## DMN

- Source of truth is schema-valid OMG DMN XML with extension `.dmn`; the same-basename `.png` is the report preview.
- A decision must have named input data, output data, decision logic, and a traceable runtime/business-rule source.
- Decision tables declare hit policy and rule order. Output reason codes in documentation must not be presented as runtime API codes unless verified.
- Keep orchestration and actor responsibility in Activity/BPMN. DMN answers only the decision question.
- When runtime executes TypeScript or another policy implementation rather than a DMN engine, state that boundary in the model and family README.
- Validate the source against the pinned OMG schema before rendering. A renderer compatibility transform may change namespaces only in memory and must never rewrite the canonical `.dmn`.

## Sequence

- Exactly one use-case scenario per file.
- Initiator must be explicit: an external actor for actor-driven use cases; an event, timer, or system source for an internal event-handling scenario.
- Participants are object instances or explicit boundary/control/entity/service objects.
- Messages use operation names with arguments where meaningful.
- Activation shows execution; creation/deletion appears only when the scenario creates/deletes an object.
- Dashed returns are optional; include only when result matters.
- Prefer `5-7` lifelines and `12-18` essential messages.
- Split large alternatives into a separate scenario instead of building a visual code listing.

## Communication

- Exactly one scenario.
- Objects and links must match a valid interaction model.
- Every declared object participates in at least one message.
- Message numbering expresses execution order; nested calls use decimal numbering.

## State

- A state represents a stable lifecycle condition, not a UI page or query filter.
- Transition label format: `event [guard] / effect` where those parts exist.
- Do not turn query eligibility into a state transition.
- Orthogonal state dimensions must be separate state machines.

## DFD

- Level 0 — context: one numbered system process, external entities, named input/output data flows, no internal store.
- Level 1 — system map: decomposes Process `0` into named processes and material stores; enough detail to select one child process.
- Level 2 — domain decomposition: expands exactly one named Level-1 process. Child process numbers retain the parent prefix, for example `3.1`, `3.2`, and `3.3` expand process `3`.
- Level 3 — workflow or primitive flow: expands one Level-2 process, or gives the complete atomic input/process/store/output view of one Level-3 identifier such as `3.1.1`.
- A child must balance the parent process: each parent input, output, source/sink, and store interaction is either preserved, explicitly refined, or declared out of scope in the child header/README.
- A branch may stop once it reaches a primitive process. Do not create empty intermediate diagrams merely to fill every number.
- Introduce another level when a diagram has multiple major concerns, long perimeter wires, crossing labels, or cannot be read on one report page.
- Process nodes show a stable process number and a verb-object name. External entities and stores show a stable identifier plus an explicit `External entity` or `Data store` role.
- Processes use verb-object names; stores/entities and flow payloads use nouns.
- Every process has input and output.
- Store access must show reads and writes where runtime performs them.
- Forbidden: entity-to-entity, entity-to-store, store-to-store.
- Child diagram must balance parent input/output flows.
- Do not use route, controller, command, repository, or event-control arrows as data flows.

## ERD

- Conceptual: business entities and relationships; no table inventory.
- Logical: identifiers, important attributes, normalized relationships, correct cardinality, and every displayed logical foreign-key target.
- Physical: actual table/column/constraint/FK shape from the verified schema.
- Every file named ERD must contain relationships. A table-only artifact must be named inventory or data dictionary.
- Many-to-many relationships require an associative entity in logical/physical models.
- Split by bounded domain; no mega ERD.
- For each displayed relationship, label the connector with the exact reference form
  `CHILD.fk_column -> PARENT.pk_column`. Mark the same child attribute as `FK` and repeat the
  target in its attribute note when notation permits.
- A polymorphic identifier, snapshot field, legacy mirror, or application reference that is not a
  foreign key must say so explicitly; never style it as an FK merely to make the diagram look complete.

## Class

- Detail diagrams use one abstraction level: conceptual domain, design class, persistence model, or DTO/mapping. A small overview or explicit mapping-boundary diagram may cross levels only when stereotypes make each role unambiguous and lower-level files remain split.
- Do not invent runtime types. Conceptual classes must be marked `<<conceptual>>`.
- Use standard visibility when attributes/operations are shown.
- Detailed diagrams that claim implementation signatures must show verified types and return types. Compact structural overviews may omit types; never invent missing runtime types merely to fill notation.
- Multiplicity uses UML values such as `1`, `0..1`, `*`, `1..*`; never `many`.
- Associations, aggregation/composition, and inheritance must match real semantics.

## Component

- Use UML components for logical/deployable units, provided/required interfaces, and static dependency direction.
- Every component maps to current source boundaries or is explicitly marked `Planned`.
- In a modular monolith, logical components are not independent runtime processes. Do not imply microservices.
- Cross-component dependency labels should name a public contract, port, domain event, or material policy relationship.
- A system overview is only an entry map. Add separate views when core capability dependencies, platform interfaces/event reactions, or transitional integration seams cannot remain readable in that overview.
- Prefer multiple bounded component views over one all-module graph with crossed connectors. Package diagrams remain responsible for folder/layer inventory.
- An overview should aggregate responsibilities rather than fan out every public contract. When one component requires more than about five visible connectors, split by consumer or provider concern before adding another line.
- Connector crossings are a failed readability gate, even when dependency semantics are correct.
- Use the ELK layout pragma and an explicit page margin for this gallery so orthogonal connectors and complete PNG bounds remain stable across overview/detail renders.
- Source is PlantUML `.puml` rendered with the pinned version documented in `Component/README.md`.

## Package

- Show packages/modules and dependency direction, not individual class inventory.
- Use package grouping and dependency stereotypes where useful.
- Every path must exist in the current tree or be marked legacy/planned.
- Cycles and cross-module public boundaries must be visible when they affect architecture.

## Architecture

- Declare viewpoint: context, container/runtime, layer, request flow, or deployment.
- Show every externally material runtime dependency used by the viewpoint.
- Do not mix planned infrastructure with current runtime without status labels.
- Current application diagrams must show controller/listener → one Command/Query/inbound
  capability. Do not draw an application service, public facade, repository, or outbound port as
  the executable inbound use-case owner.
- Composition arrows mean synchronous construction/injection only. Do not show a composition
  factory calling `.handle()`/`.execute()`, opening a transaction, deciding business ordering, or
  mapping a business result.
- Removed runtime components disappear from current diagrams. In particular, User Activity is not
  a live component; `retired_user_activity_events` may appear only as a read-only archive or
  migration-provenance note, while Audit remains canonical evidence.

## Deployment

- Use UML nodes, execution environments, deployed artifacts, and communication paths.
- Distinguish repository-defined/local reference topology from an observed production deployment.
- If production has not been deployed, use `Partial` or `Planned`; do not claim availability, scaling, ingress, TLS termination, secrets, backup, or monitoring infrastructure without evidence.
- Source is PlantUML `.puml` rendered with the pinned version documented in `Deployment/README.md`.

## User Flow

- One user journey from trigger to outcome.
- Use screen/user decision language, not repository or SQL language.
- Include failure/recovery only when it changes the journey.
