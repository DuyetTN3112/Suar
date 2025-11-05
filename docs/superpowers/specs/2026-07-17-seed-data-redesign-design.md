# Seed Data Redesign Design

## Goal

Replace the current demo seed set with a realistic, linked Suar operating dataset. The seed must stop reading like local QA filler and instead show how Suar works across organization work, project operating model, sprint delivery, task submission, skill review, dispute handling, profile proof, marketplace participation, and admin moderation.

## Current Findings

The current seed has useful technical scaffolding, but much of the content is not product-realistic. User bios, task titles, descriptions, review text, notifications, project descriptions, and generated dense tasks include phrases such as local verification, seed scenario, account test, and QA local. Those records are technically linked enough for basic pages, but the narrative is test-focused.

The linked data is incomplete for the newer product surface. The seed clears tables such as `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, `sprint_environment_reviews`, `sprint_reverse_review_workflows`, `task_submissions`, `task_submission_evidences`, `task_comments`, `task_versions`, `review_dispute_case_files`, and `ai_dispute_evaluations`, but does not repopulate them as a coherent story. That leaves sprint management, reverse review boards, task submission evidence, and admin dispute dossier flows underrepresented.

The `/home/tranngocduyet/Projects/data_train` dataset should not be imported directly. Its raw records often do not match Suar schema and some labels are low-confidence or not Suar-scoped. Its strongest value is its dispute case structure: task snapshot, review snapshot, skill reviews, dispute claim, evidence quality, profile credibility context, final decision, rationale, confidence, and applied rule.

## Chosen Approach

Use a hybrid seed.

1. A primary realistic storyline proves deep product behavior end to end.
2. A smaller dense background set keeps dashboards, boards, search, admin lists, and marketplace pages non-empty.
3. Dense records must be generated from named domain scenarios, not generic filler.

This balances product believability with QA usefulness.

## Storyline

Primary tenant: `Suar Operating Studio`.

Business narrative: a software delivery organization uses Suar to run a real project operating model. The team staffs roles, plans sprints, ships tasks, submits evidence, receives skill reviews, opens disputes when evidence and review scores conflict, and uses admin review plus AI-assisted dispute evaluation for resolution.

Core project: `Trust Review Operating System`.

Project themes:

- task review workflow and skill evidence
- public talent profile proof
- sprint planning and sprint reverse review
- marketplace contributor applications
- review dispute governance
- admin moderation and AI dispute support

Secondary tenants should remain, but their content becomes realistic:

- `Open Education Guild`: curriculum operations and learner evidence workflows
- `Creator Circle Studio`: marketplace growth and talent discovery
- `Remote Talent Pool`: external contributor showcase and staffing
- `Data Ops Research Guild`: dataset quality, evidence classification, and insight workflows

## Personas

Keep current seed keys and canonical emails where tests depend on them, but rewrite persona content away from test-account language.

- `owner`: product/operator persona, owner of primary org, also external contributor in secondary contexts.
- `superadmin`: platform trust and safety administrator.
- `member`: delivery contributor with profile proof and review history.
- `orgAdmin`: delivery manager and reviewer.
- `peerReviewer`: QA/review specialist.
- `orgBOwner`: education operations owner.
- `externalContributorOne`: marketplace contributor specializing in content/review evidence.
- `externalContributorTwo`: data quality contributor specializing in analytics and QA.

## Data Model Coverage

The seed must cover these linked chains.

### Organization and Project

Each organization must have realistic description, owner, memberships, projects, project members, skills, professional roles, subscriptions, attachments, and current organization context.

Project descriptions must describe business outcome, not local testing purpose.

### Task and Sprint

Primary project must include:

- one active sprint with goal and sprint backlog
- one closed or review-open sprint with completed tasks
- backlog tasks not in a sprint
- tasks spread across todo, in progress, in review, and done
- task versions for changed requirements
- task comments that are useful during later review/dispute
- task assignment snapshots where assignment evidence matters

Tasks must include realistic acceptance criteria, expected deliverables, verification method, tech stack, context, impact, measurable outcomes, and required skills.

### Submission and Evidence

Completed and review-ready tasks must have:

- `task_submissions`
- `task_submission_evidences`
- pull request URL, demo URL, test notes, implementation notes, and known limitations where relevant
- evidence titles that can appear naturally in admin dispute case files

### Review and Profile Proof

Review sessions must connect to assignments and submissions. Skill reviews must reference required skills when available. User skill aggregates, work history, performance stats, profile snapshots, reverse reviews, and domain expertise must reflect those reviews.

### Dispute Dossier

At least three dispute scenarios must be present:

1. Strong evidence, low score, lower reviewer credibility: expected final decision `adjust_score`.
2. Poor evidence, failing acceptance criteria, low score: expected final decision `uphold_review`.
3. Missing or ambiguous context: expected final decision `request_more_evidence` or admin-reviewing unresolved state.

Each dispute must have:

- review session
- task assignment
- task submission
- submission evidence
- task comments
- task history
- review dispute comments from both reviewee and counterparty
- review dispute case file with completeness score
- AI dispute evaluation row for resolved dispute scenarios and one pending-ready row for the unresolved missing-context scenario

The dossier structure should be inspired by `data_train/generated/dispute_council_train.jsonl` and `data_train/generated/suar_review_dispute_case_files.jsonl`, not copied verbatim.

### Sprint Reverse Review

Seed at least one review-open sprint with:

- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_environment_reviews`
- `sprint_reverse_review_workflows`
- workflow states across awaiting review, awaiting response, disputed, reported, and done where feasible

This supports sprint management and reverse review boards.

### Marketplace

Public or external tasks must include applications in pending, approved, rejected, and withdrawn states. Approved applications must create a matching external contributor assignment and notifications/audit events.

## Dense Background Data

Dense mode can still exist, but generated tasks must use scenario templates tied to the project domain.

Allowed dense themes:

- evidence capture
- review rubric calibration
- sprint readiness
- marketplace applicant QA
- data quality checks
- profile proof publishing
- search/index freshness
- moderation queue triage

Generated text must not contain:

- seed
- local verification
- QA local
- account test
- filler
- scenario task
- demo-only wording in user-visible fields

Internal code comments and test names may still mention seed when they describe implementation mechanics instead of user-visible demo content.

## Integrity Requirements

`assertSeedIntegrity` must become stronger. It should verify:

- canonical users and orgs exist
- every seeded task project and organization link is valid
- primary storyline has at least one sprint
- sprint tasks include sprint id and backlog tasks remain null
- completed/reviewed tasks have assignments, submissions, submission evidence, review sessions, skill reviews, and self assessments
- disputed reviews have dispute comments, case files, and non-empty snapshots
- case file completeness is high for complete scenarios
- sprint review package data exists when sprint review tables exist
- user profile snapshot and user skills exist
- no user-visible seed copy includes banned filler phrases

## Source Use From `data_train`

Use `data_train` as reference material only.

Reusable concepts:

- evidence quality fields: submission present, code review present, test results present, deadline miss, acceptance criteria met, test coverage, summary
- verdict rules: strong evidence with low score, task clearly failed, low reviewer credibility, missing data
- dispute claim shapes: dimensions, requested outcome, skill-level disagreement
- case file completeness and missing data

Do not directly import raw personal names, raw issue text, external product names, or unlabeled records into Suar seed.

## Implementation Shape

Keep existing modular seed architecture, but add focused seed modules rather than putting everything into `commands/seed_data.ts`.

Likely modules:

- `task_submission_seeder.ts`
- `review_dispute_dossier_seeder.ts`
- `sprint_seeder.ts`
- `seed_copy_guard.ts`

Existing modules to revise:

- `user_seeds_specs.ts`
- `organization_seeds_specs.ts`
- `project_seeder.ts`
- `task_specs.ts`
- `task_seeder.ts`
- `review_specs.ts`
- `review_data_seeder.ts`
- `profile_seed.ts`
- `mongo_seed.ts`
- `seed_integrity.ts`
- `commands/seed_data.ts`

## Verification Plan

Minimum verification:

- unit test for task spec density behavior still passes
- new unit or integration test for seed copy guard
- integration or command-level validation that seed integrity checks deep linkage
- `pnpm run test:unit --files=seed_task_specs`
- targeted review dispute seed integration test if current test DB setup is available
- `gitnexus detect-changes` before any commit or final completion claim

If database services are unavailable locally, report exact command failure and keep completion unclaimed.

## Risks

The worktree is already heavily dirty, including modified seed files and new sprint/review modules. All implementation must preserve unrelated user work and edit only seed-related files.

Some tests rely on canonical seed emails and current org behavior. Keep identifiers stable while changing visible narrative.

New sprint/review tables may not exist in every environment until migrations run. Seed helpers should check table existence for optional newer tables, or integrity checks should branch on table existence.

## Approval Decision

Approved direction: Hybrid realistic storyline plus controlled dense background data.
