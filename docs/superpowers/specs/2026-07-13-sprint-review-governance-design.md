# Sprint Review Governance Design

## Summary

Suar must separate two review loops:

- forward task review evaluates the person who completed a task;
- sprint reverse review evaluates the people and environment that shaped the work experience.

Forward task review stays tied to task completion, submission, reviewer quorum, confirmation, dispute, escalation, and profile update governance.

Reverse review moves out of the task review page. It is collected at project sprint close and writes separate feedback signals for:

- each manager, lead, or assigner the reviewer actually worked with in that sprint;
- the project environment;
- the organization environment.

The current repository already deprecates task-level reverse review creation, but it does not yet expose a first-class sprint domain. This design introduces that missing boundary.

## Current Runtime Truth

Evidence from docs and code shows:

- task submission can move the task into review and create a review session;
- review sessions seed reviewer assignments using creator, manager, and peer governance rules;
- task comments and dispute comments are separate concepts;
- report-to-admin builds a dispute case file with task, submission, evidence, task comments, dispute comments, review, skill reviews, and task history snapshots;
- admin dispute pages already expose `completeness_score` and `missing_data`;
- reverse review task-level creation is product-deprecated and points users toward sprint close;
- no first-class `sprint` schema, route, or runtime module exists yet.

## Product Decisions

1. Sprint truth is `project sprint`.
2. A sprint belongs to one project and one organization.
3. Task review remains per task.
4. Reverse review is collected at sprint close, not task close.
5. One sprint reverse review package can create multiple manager-target reviews.
6. Manager targets must be suggested from real sprint interaction, not arbitrary users.
7. Environment review always has two separate targets: project and organization.
8. A user's manager review signal updates the target user's profile, even if that user is a manager, owner, or lead.
9. Project environment review updates project-level environment metrics.
10. Organization environment review updates organization profile and organization listing metrics.
11. Admin dispute resolution must respect dossier readiness before profile-impacting closure.

## Domain Model

### Project Sprint

`project_sprints` records a reviewable work window.

Core fields:

- `id`
- `organization_id`
- `project_id`
- `name`
- `starts_at`
- `ends_at`
- `status`: `draft | active | review_open | review_closed | archived`
- `created_by`
- `closed_by`
- `review_opened_at`
- `review_closed_at`

Rules:

- only project/org managers can create and close sprints;
- a sprint can open reverse review only after it closes;
- tasks counted in a sprint are tasks in that project whose assignment or completion overlaps the sprint window;
- sprint review remains project-scoped even when organization aggregates metrics later.

### Sprint Review Package

`sprint_review_packages` represents one reviewer's response set for a project sprint.

Core fields:

- `id`
- `sprint_id`
- `reviewer_id`
- `status`: `pending | submitted | expired`
- `submitted_at`

Rules:

- one package per reviewer per sprint;
- reviewer must have been a project member, task assignee, reviewer, manager, or participant with meaningful sprint activity;
- package contains multiple child review records;
- package completion requires at least one environment response for project and one for organization;
- manager reviews are optional but strongly prompted when eligible manager targets exist.

### Sprint Manager Review

`sprint_manager_reviews` stores feedback about a specific person who assigned, led, or managed work in the sprint.

Core fields:

- `id`
- `package_id`
- `target_user_id`
- `target_role`: `manager | lead | assigner | owner`
- `rating`
- `dimensions`
- `comment`
- `is_anonymous_to_target`

Rules:

- one record per manager target;
- target user must be in the derived eligible target list;
- reviewer cannot review themself;
- manager review updates the target user's profile and manager/reviewer credibility metrics after aggregation;
- manager review is not a task review and must not modify task review outcomes.

### Sprint Environment Review

`sprint_environment_reviews` stores feedback about the project and organization environment.

Core fields:

- `id`
- `package_id`
- `target_type`: `project | organization`
- `target_id`
- `rating`
- `dimensions`
- `comment`
- `is_anonymous_publicly`

Rules:

- every submitted package must include one project review and one organization review;
- project and organization targets are separate rows;
- project target uses the package sprint's `project_id`;
- organization target uses the package sprint's `organization_id`;
- project environment metrics surface in project detail and project review center;
- organization environment metrics surface in organization profile and organization listing.

## Lifecycle

### Forward Task Review

1. User completes work and submits a completion package.
2. Task enters review zone.
3. Review session opens and reviewer assignments are seeded.
4. Reviewers submit skill reviews according to quorum.
5. Reviewee confirms or disputes.
6. If disputed, formal exchange happens in dispute room.
7. If unresolved, reviewee reports dispute to admin.
8. System builds case file snapshot.
9. Admin resolves dispute.
10. Profile and task governance update according to final decision.

### Sprint Reverse Review

1. Project sprint is created and marked active.
2. Tasks and assignments happen during the sprint.
3. Sprint is closed by owner, manager, or authorized project lead.
4. System opens sprint review packages for eligible reviewers.
5. Reviewer completes project environment review.
6. Reviewer completes organization environment review.
7. Reviewer optionally reviews one or more eligible managers, leads, or assigners.
8. Package is submitted.
9. Aggregation updates manager profiles, project environment metrics, and organization environment metrics.
10. Organization listing shows environment signals to help users judge whether to join.

## Role Flows

### ExternalContributor or Worker

During task work, the worker uses task comments for work context and task submission for delivery proof.

After review, the worker can confirm or dispute the review result. If a dispute is escalated, the worker's task comments, dispute comments, evidence, and task context travel into the admin dossier.

At sprint close, the worker sees a sprint review package. The package clearly separates:

- people who managed or assigned their work;
- project environment;
- organization environment.

### Owner, Manager, or Lead

Owners and managers can create or close project sprints when policy allows.

In task review, they may be reviewers or dispute participants based on existing task and project role rules.

In sprint reverse review, they can become review targets. Signals about their management quality update their personal profile, not the organization profile.

If a person is both an owner and manager, the system records two different signal types:

- personal manager feedback on the user profile;
- environment feedback on the organization profile.

### System Admin

System admin primarily handles task review disputes, governance anomalies, abuse, and moderation.

Admin should not need to approve every sprint reverse review. Admin intervention is for abuse patterns such as retaliation, fake reviews, repeated mutual inflation, or privacy violations.

For task review disputes, admin resolution must display dossier readiness and block normal resolution when required data is missing.

## Dispute Dossier Readiness

A dispute case file is resolution-ready only when it includes required data for fair adjudication and profile calculation.

Required data:

- task snapshot;
- assignment snapshot;
- submission snapshot;
- review session snapshot;
- skill reviews snapshot;
- dispute claim;
- at least one reviewee dispute message;
- at least one counterparty dispute message.

Strongly recommended data:

- task comments;
- task submission evidence;
- self assessment;
- task history;
- reviewer context;
- reviewee profile context.

If required data is missing:

- admin sees blocking readiness state;
- reviewee receives a warning;
- counterparty receives a warning;
- normal resolve action is disabled.

Admin override is allowed only for exceptional cases and must require:

- final rationale;
- explicit override reason;
- audit event;
- no automatic positive profile update unless profile action is explicitly chosen.

## Permissions

Project sprint management:

- organization owner can create, update, close, and archive project sprints;
- organization admin can create, update, close, and archive project sprints;
- project owner can create, update, close, and archive sprints for their project;
- project manager can create, update, and close sprints for their project;
- regular project members can read active and review-open sprint state.

Sprint review package:

- eligible reviewer can read and submit their own package;
- target manager cannot read private reviewer identity when anonymity applies;
- organization owner/admin can read aggregate results, not private raw comments unless policy allows;
- system admin can read raw records for moderation and abuse handling.

Admin dispute resolution:

- only system admin can resolve platform-level review disputes;
- organization admin cannot resolve platform dispute unless the route explicitly scopes it to organization mediation;
- any profile-impacting decision must be audited.

## Anti-Abuse Rules

Manager target eligibility must come from sprint evidence:

- assigned tasks in sprint;
- created tasks in sprint;
- project manager role during sprint;
- project owner role during sprint;
- explicit sprint lead assignment.

The system should flag:

- same reviewer repeatedly giving extreme ratings to same target;
- manager reviewing themself through role confusion;
- target pressure patterns around sprint close;
- sudden rating spikes;
- many anonymous low ratings from newly created accounts;
- reciprocal high review clusters.

Flagging does not delete review data. It marks aggregation confidence and may require admin moderation before public/profile impact.

## UI Surfaces

### Project Workspace

Add a sprint area under project workspace:

- sprint list;
- sprint detail;
- active sprint status;
- close sprint action;
- review package status;
- aggregate sprint feedback summary.

### User Workspace

Add a sprint review inbox:

- pending sprint review packages;
- submitted package history;
- environment review form;
- manager target selection;
- warning when manager targets are derived from sprint activity.

### Organization Profile and Listing

Organization cards and organization profile should show:

- environment rating;
- review count;
- confidence label;
- recent trend;
- warning when evidence is thin or disputed.

### Admin Console

Admin dispute detail should show:

- readiness state;
- missing required data;
- affected parties;
- normal resolve disabled when required data is missing;
- override action with reason field;
- audit history.

Admin moderation should also list suspicious sprint reverse review signals.

## API Surfaces

Project sprint APIs:

- `GET /api/v1/projects/:projectId/sprints`
- `POST /api/v1/projects/:projectId/sprints`
- `GET /api/v1/projects/:projectId/sprints/:sprintId`
- `PATCH /api/v1/projects/:projectId/sprints/:sprintId`
- `POST /api/v1/projects/:projectId/sprints/:sprintId/close`
- `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review`

User sprint review APIs:

- `GET /api/v1/me/sprint-review-packages`
- `GET /api/v1/me/sprint-review-packages/:packageId`
- `POST /api/v1/me/sprint-review-packages/:packageId/submit`

Organization read APIs:

- `GET /api/v1/organizations/:organizationId/environment-reviews`
- `GET /api/v1/projects/:projectId/environment-reviews`

Admin APIs:

- `GET /api/admin/sprint-reverse-reviews/flags`
- `POST /api/admin/sprint-reverse-reviews/:reviewId/moderate`

## Testing Requirements

Unit tests:

- sprint status transitions;
- manager target eligibility;
- package completion rules;
- environment target validation;
- dispute dossier readiness.

Integration tests:

- close sprint creates review packages;
- package submit writes manager, project, and organization records;
- self-review manager target is rejected;
- org/project aggregate metrics update after submission;
- admin dispute resolve is blocked when required dossier data is missing.

Frontend tests:

- worker sees pending sprint review package;
- manager target list contains only eligible people;
- environment form requires project and organization responses;
- organization listing shows environment score and evidence count;
- admin resolve tab disables normal resolve when required dossier data is missing.

E2E tests:

- project sprint close to worker package submission;
- manager profile receives reverse review signal;
- organization listing displays environment review aggregate;
- admin dispute warning appears for incomplete dossier.

## Rollout Plan

Phase 1: domain and policy

- add sprint tables;
- add review package tables;
- add eligibility and completion rules;
- add dispute dossier readiness policy.

Phase 2: backend flows

- create/close sprint;
- open review packages;
- submit package;
- aggregate manager/project/org signals.

Phase 3: UI

- project sprint pages;
- user sprint review inbox;
- organization environment display;
- admin readiness gate.

Phase 4: moderation

- sprint reverse review flags;
- admin moderation queue;
- confidence labels in public profile/listing.

## Non-Goals

- replacing task review or task dispute flow;
- letting sprint reverse review change task outcomes;
- letting managers confirm or reject ordinary reverse reviews;
- building a generic survey engine;
- making organization environment feedback fully public without aggregation and privacy filtering.

## Open Implementation Notes

The first implementation should avoid broad rewrites. Add the sprint-review domain beside existing review code and connect it through narrow public contracts.

Existing reverse review read surfaces can keep working while new sprint review records feed them through adapter queries later.

Task-level reverse review create routes should remain deprecated until the sprint-close flow is live.
