# Project Operating Model Demo Design

## Summary

Suar's demo should show that a project is not only a container for tasks. A project is the operating model that makes later task creation fast, consistent, reviewable, and useful for profile updates.

The demo story is:

1. the owner spends more time creating a project operating model;
2. the project captures roles, skills, staffing, work areas, task presets, Definition of Done, and review policy;
3. task creation becomes short because the task inherits the project's configured contract;
4. sprint is recognized as the normal planning layer between project and task, but is not shown in the time-boxed demo;
5. task completion moves into review;
6. the review either updates the assignee profile or becomes a dispute package for admin resolution.

The core product promise is: **setup project deeply once, create many high-quality tasks quickly afterward.**

## Authoritative Task Completion Decision (2026-08-10)

This specification supersedes any older interpretation in this document that
requires an assignee to submit a Completion Report, upload evidence, or satisfy
an evidence checklist before a task can be marked complete.

The product flow is:

1. The creator defines the task brief, expected output, and acceptance criteria.
2. The creator assigns A to do the task and B to review/accept the result.
3. A performs the work and changes the task status to `Done`. No submission,
   report, upload, or acknowledgement is required from A for this transition.
4. B reviews the completed task and accepts it or requests rework.

Completion Reports, evidence, attachments, and dispute artifacts are optional
governance/review material. They may enrich a review or profile signal when a
project explicitly uses them, but they must never be a mandatory task-completion
gate or appear as an assignee-only "Nộp bài" workflow.

## Current Runtime Truth

Current code already supports important parts of this model:

- project creation has a three-step wizard: foundation, staffing, launch;
- project creation already exposes role blueprints such as delivery squad, review pipeline, and marketplace rollout;
- project detail already has tabs for details, members, skills, and roles;
- project roles can carry role skills with minimum level, target level, assessment ceiling, mandatory flag, importance, and weight;
- project members can be assigned to a project professional role;
- project role candidate matching exists through role staffing candidate APIs and UI dialogs;
- task creation requires project, required skills, acceptance criteria, and verification method;
- task creation already has a role prefill panel that loads project role requirements, fills task required skills, infers task type, applies task contract presets, and suggests role-matched assignees;
- project sprint schema and sprint review governance exist in the codebase, but sprint is newer and should not be part of the short demo path;
- review session, confirmation, dispute, and optional governance artifacts already exist in separate e2e coverage; they begin after A marks the task `Done`.

The gap is not a total rebuild. The gap is making the project operating model first-class and demo-obvious, then proving task inheritance end-to-end.

## Product Decision

Use **Project Operating Model** rather than a short project wizard.

Project creation may take longer because it is the place where the owner defines how work should be created, staffed, completed, reviewed, and transformed into profile signals.

Task creation must become shorter because the task can inherit:

- project context;
- role requirements;
- task preset;
- Definition of Done;
- verification method;
- optional review-material expectations;
- review policy;
- suggested assignee;
- profile update intent.

Sprint remains part of the product model. It is the planning container for a batch of tasks inside a project, but the demo will not open or manage sprint screens. The demo can mention that the created task may later be grouped into a sprint, then continue directly into the task and review flow.

## Demo Flow

### 1. Owner Login And Org Context

The demo starts with `tranngocduyet31@gmail.com`, an organization owner account.

The owner logs in, lands in the organization workspace, and confirms the active organization context.

Expected UI signals:

- active organization visible in sidebar or header;
- owner/admin navigation visible;
- Projects and Tasks are reachable without route errors;
- typography, spacing, and sidebar active states look stable.

### 2. Create Project Operating Model

The owner creates a project. This is intentionally not a tiny form.

The creation or post-create setup should cover:

- project charter;
- roles and skills;
- staffing;
- work areas;
- task presets;
- Definition of Done;
- review policy;
- launch task action.

The owner can explain:

> "Project setup is where we define the operating model. This makes every later task faster and more consistent."

### 3. Project Charter

Project charter captures high-level defaults that later tasks should reuse.

Fields:

- project name;
- description and scope;
- organization;
- status;
- start date;
- end date;
- business domain;
- tech stack;
- success metrics.

Task inheritance:

- `business_domain` defaults from project charter;
- `tech_stack` defaults from project charter;
- task context can reference project scope;
- domain tags can include project-level tags.

Demo acceptance:

- owner can fill visible project context without hunting through hidden controls;
- after project creation, project detail displays enough context for task authors to understand why this project exists.

### 4. Roles And Skills

Roles define the professional lanes inside the project.

Each role includes:

- name;
- code;
- description;
- required skills;
- minimum level;
- target level;
- assessment ceiling;
- mandatory or optional;
- importance;
- weight.

Task inheritance:

- choosing a role on task creation fills required skills;
- inherited skills preserve source project role and role skill IDs;
- inherited skills mark requirement source as professional role prefill;
- role code can infer task type.

Demo acceptance:

- owner can show at least two roles;
- each role has visible skills and levels;
- task creation from a role visibly loads those skills.

### 5. Staffing And Candidate Suggestions

Staffing assigns organization members into project roles.

Candidate suggestions should rank members by:

- required skill match;
- target level match;
- existing project membership;
- organization membership;
- review history;
- trust or credibility signal;
- active dispute or governance risk signal;
- role availability.

This can be implemented in stages. For the demo, the suggestion must at least show:

- suggested candidates per role;
- why each candidate was suggested;
- whether the person is already in the project or only in the organization;
- a quick action to assign the candidate to the role.

Task inheritance:

- task assignee suggestions prioritize project members already assigned to the selected role;
- if exactly one matching member exists, task creation may preselect them;
- if multiple candidates exist, the UI displays "Gợi ý assignee".

Demo acceptance:

- owner can add members to the project;
- owner can assign members into project roles;
- owner can show a candidate suggestion panel;
- task creation shows matching assignees for the selected role.

### 6. Work Areas

Work areas group repeated task contexts inside a project.

Recommended work areas:

- UI;
- API;
- QA;
- Review;
- Docs;
- Ops.

Each work area includes:

- description;
- default task types;
- relevant role lanes;
- default evidence expectations;
- common deliverables;
- risk notes.

Task inheritance:

- selecting a work area narrows task presets;
- task context background can include work area context;
- domain tags can include work area tags.

Demo acceptance:

- project detail has a visible way to explain repeated work areas;
- task creation can show or imply the chosen work area through preset/task type.

### 7. Task Presets

Task presets are the main tool for shortening task creation.

Recommended presets:

- Feature delivery;
- Bug fix;
- QA pass;
- Review package;
- Architecture decision;
- Documentation;
- Ops / release readiness.

Each preset includes:

- task type;
- verification method;
- acceptance criteria;
- context background template;
- expected deliverables;
- optional review material;
- learning objectives;
- domain tags;
- suggested reviewer policy.

Task inheritance:

- selecting a preset fills task type;
- verification method is filled;
- acceptance criteria is filled;
- context background is filled;
- learning objectives are filled;
- domain tags are filled;
- optional review material is visible to B in review context when configured; it is not an assignee submission checklist.

Demo acceptance:

- owner can choose "Launch task" from a role or preset;
- task form opens prefilled;
- owner only needs to edit title, specific description, deadline, and assignee.

### 8. Definition Of Done

Definition of Done is project-level completion policy.

Recommended checklist:

- output summary is present;
- acceptance criteria are satisfied;
- optional evidence link or screenshot may be attached when the project requires review material;
- test or manual verification is recorded;
- self-assessment is present;
- reviewer can inspect the result;
- task is ready for profile-impacting review.

Task inheritance:

- task readiness card reflects DoD completeness;
- the task detail shows the creator-authored output and acceptance criteria;
- review page can show whether the task is ready for B after A marks it `Done`.

Demo acceptance:

- owner can say what "Done" means before tasks exist;
- creator and reviewer B see the expected output and acceptance criteria;
- review flow starts cleanly after A marks the task `Done`.

### 9. Review Policy

Review policy defines how task output becomes profile signal.

Fields:

- default reviewer source: creator, owner, project manager, role lead, peer, or explicit reviewer;
- required reviewer count;
- profile skills to update;
- evidence requirements;
- confirmation rule;
- dispute rule;
- admin report package contents.

Report package contents:

- task snapshot;
- assignment snapshot;
- submission snapshot;
- required skill snapshot;
- review snapshot;
- skill reviews;
- self-assessment;
- task comments;
- dispute comments;
- evidence;
- task history.

Task inheritance:

- task knows whether review is expected;
- review session seeds reviewer assignments from policy;
- approve path updates user profile signals;
- dispute path opens a dispute room;
- report path sends the complete package to admin.

Demo acceptance:

- owner can explain who reviews the task and why;
- assignee can confirm or dispute;
- unresolved dispute can be reported without showing admin console.

### 10. Launch Task From Project

The "Launch Task" moment is the demo payoff.

Entry points:

- role card: "Tạo task từ role";
- task preset card: "Tạo task từ preset";
- project header action: "Launch task";
- staffing recommendation: "Tạo task cho người này".

The task form should receive query params such as:

- `project_id`;
- `roleId`;
- `taskType`;
- optional `preset`;
- optional `workArea`.

Task form behavior:

- load project;
- load project role requirements;
- apply task contract preset;
- show readiness card;
- show selected project, role lane, and assignee scope;
- suggest assignees;
- require only missing task-specific details.

Demo acceptance:

- task creation feels materially shorter than a blank task form;
- inherited skills and criteria are visible before submit;
- after creating the task, owner can open and edit it to prove the task is real.

### 11. Sprint Positioning

Sprint is the missing middle layer between project operating model and individual tasks.

Product hierarchy:

- organization owns projects;
- project defines operating model;
- sprint groups execution windows inside a project;
- task inherits from project operating model and may belong to a sprint;
- review evaluates task completion;
- sprint reverse review evaluates managers, project environment, and organization environment later.

For this demo, sprint is intentionally not shown.

Reason:

- demo time is limited;
- sprint was introduced later than the rest of the task flow;
- showing sprint would add another planning screen before the audience understands project-to-task inheritance;
- the main demo promise is project operating model reducing task creation effort.

Demo wording:

> "Normally these tasks can be grouped into a sprint. For this short demo I will skip sprint planning and show the project operating model flowing directly into a task, then into review."

Implementation implication:

- task creation should allow `project_sprint_id` to stay empty;
- project operating model should not depend on sprint existing;
- sprint support should remain compatible with the same role, preset, DoD, and review policy concepts;
- visual copy should avoid implying sprint is unavailable, only that it is optional for this demo.

## UI Structure

### Project Create

Project creation should be allowed to feel deliberate.

Suggested steps:

1. Charter;
2. Roles & Skills;
3. Staffing;
4. Operating Rules;
5. Launch.

If the current implementation keeps three steps for now, the second and third steps must clearly preview the operating model:

- selected blueprint;
- roles;
- staffing coverage;
- next task plan;
- inherited task contract summary.

### Project Detail

Project detail should add a top-level `Operating Model` or `Task Factory` tab.

Recommended tabs:

- Overview;
- Members;
- Skills;
- Roles;
- Operating Model;
- Sprints or Reviews when available.

The `Operating Model` tab should contain:

- charter summary;
- work areas;
- task presets;
- Definition of Done;
- review policy;
- launch task actions.

### Task Create

Task create should visually communicate inheritance.

Required visible sections:

- project context strip;
- role prefill panel;
- preset selector or applied preset badge;
- task readiness card;
- assignee suggestions;
- inherited skills;
- inherited acceptance criteria and verification method.

The form should avoid making the user re-enter fields that the project already knows.

## Data Model Strategy

Use a staged approach.

### Stage 1: Demo-Ready Without Heavy Schema

Use existing data plus frontend-defined task presets:

- project professional roles;
- project role skills;
- project members;
- existing task contract presets;
- query params for role and task type;
- project detail UI cards for DoD and review policy defaults.

This stage is enough to make the demo coherent if the UI clearly explains inheritance.

### Stage 2: Persist Project Operating Model

Add persistent project-level operating model data:

- `project_operating_models` or `projects.operating_model` JSONB;
- work areas;
- task presets;
- Definition of Done;
- review policy;
- evidence requirements.

Persisting the model enables:

- saved task presets per project;
- editable DoD;
- audit trail;
- multiple presets per work area;
- project-specific review policies.

### Stage 3: Policy-Driven Review Automation

Connect review policy to review session seeding:

- choose reviewer sources;
- require reviewer quorum;
- choose which skills profile updates;
- shape dispute package readiness checks.

This stage is product-critical later, but the immediate demo can show policy preview and use existing review lifecycle.

## E2E Coverage Plan

### Golden Demo E2E

Create one high-level e2e that follows the actual demo:

1. login owner;
2. create project operating model;
3. create roles and role skills;
4. add and assign members;
5. open candidate suggestions;
6. launch task from role or preset;
7. assert task form inherited role skills and task contract;
8. create task;
9. edit task;
10. login assignee;
11. assignee A moves the task to Done without submission;
12. reviewer B reviews;
13. reviewer B accepts or requests rework;
14. if disputed, both sides comment;
15. report admin package.

This e2e should not require sprint setup. A separate sprint e2e should cover sprint grouping and sprint reverse review.

### Visual Audit E2E

Capture screenshots for:

- owner org dashboard/sidebar;
- project create charter;
- project roles and skills;
- staffing suggestions;
- operating model / task factory tab;
- task create inherited contract;
- task detail review zone;
- optional review-material panel, when configured;
- pending review queue;
- review confirmation;
- dispute room;
- reported-to-admin state.

### Regression E2E

Keep targeted tests for:

- `/org/talents` route and candidate directory;
- `/org/disputes` route and dispute queue;
- task role prefill;
- task creation without sprint;
- task creation with sprint when sprint is present;
- optional governance package;
- review lifecycle;
- dispute report package.

## Known Current Risks

- Some org route names use `org/...` while org app modules live under `modules/<feature>`, so route resolving must stay stable.
- The project operating model is partly implied through frontend presets and role prefill, not fully persisted yet.
- Sprint is a real product layer but is intentionally excluded from the short demo; wording must make this feel like scope control, not a missing feature.
- Candidate suggestions are useful only if explanation text makes match reasons clear.
- Review policy is not yet fully connected to automated review assignment for every task shape.
- Dirty worktree makes broad refactors risky; implementation should be narrow and demo-facing.

## Success Criteria

The demo is successful when:

- the owner can explain why project setup takes time;
- project setup visibly creates reusable operating rules;
- task creation from project is visibly faster than a blank task;
- inherited role skills and task criteria are visible;
- suggested assignee flow is visible;
- assignee A can move the task to Done without a submission;
- review zone appears after completion;
- reviewer B can review and accept or request rework;
- unresolved dispute can be reported to admin with a complete package;
- screenshots prove the main UI, sidebar, typography, colors, and flow states are presentable.

## Non-Goals For Immediate Demo

- showing admin final resolution;
- showing sprint planning or sprint reverse review in this demo;
- building a full policy engine for every review assignment edge case;
- making every project operating model field deeply persistent before the demo;
- redesigning the whole project module;
- changing unrelated marketplace or admin flows.
