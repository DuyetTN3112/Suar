# Task Comments, Review Zone, Dispute Governance, and Reverse Reviews

## Summary

## Product decision update — 2026-07-09

This design started from a per-task reverse-review assumption. That assumption is now obsolete.

Current product decision:

- forward review and dispute still happen per completed task;
- reverse review is no longer opened from the task review page;
- reverse review should be collected at sprint close, not after every single task;
- existing reverse-review read surfaces may remain temporarily, but task-level reverse-review creation is no longer the intended end-state.

Important technical gap:

- the current repository does not yet expose a first-class sprint domain in schema/routes/runtime modules;
- therefore "move reverse review to sprint close" is a product direction, not an already-available implementation switch;
- the codebase can safely deprecate task-level reverse review now, but true sprint-close reverse review still needs its own domain boundary.

This design strengthens Suar's post-completion task flow so that:

- every user with task access can comment on a task;
- task comments support `@username` mentions with notifications;
- task comments can be marked as review-relevant and become part of dispute evidence;
- completed tasks enter a first-class review zone with explicit reviewer quorum rules;
- reviewee confirmation and dispute creation flow through one consistent governance path;
- unresolved disputes can be escalated to system admin with a complete case file;
- reverse reviews remain feedback artifacts, but their collection point moves to sprint close instead of per-task review completion;
- organization pages show organization review and reverse review governance more clearly.

This design does **not** introduce a generic cross-domain comment platform. Task comments remain in the `tasks` domain because they are tightly coupled to task context, mention resolution, review relevance, and dispute case file snapshots.

## Goals

### Primary goals

1. Add complete task comment support across backend and frontend.
2. Support `@mention` tagging with notifications for users in the same organization.
3. Treat selected task comments as part of review and dispute context.
4. Strengthen the review zone after a task reaches `done`.
5. Enforce review quorum:
   - at least 1 manager review;
   - at least 2 peer reviews;
   - creator review is required.
6. Ensure reviewee has two clear actions after review completion:
   - confirm;
   - dispute.
7. Ensure dispute room supports:
   - two-way conversation;
   - evidence exchange;
   - escalation to system admin.
8. Preserve and later adapt reverse review statistics/surfaces so they can be fed by sprint-close reverse reviews instead of task-close reverse reviews.
9. Improve organization-facing display of organization reverse reviews and governance summary.

### Secondary goals

- Reduce duplicated or inconsistent dispute creation paths.
- Make frontend reflect backend governance states clearly.
- Keep task comments in the task domain unless future reuse justifies extraction.

## Non-goals

- Building a generic reusable comment engine for all modules.
- Replacing the existing dispute evidence model.
- Changing the meaning of reverse reviews into direct review-outcome overrides.
- Keeping task-level reverse-review creation as a permanent UX path.
- Reworking AI dispute evaluation semantics in this phase.

## Current state

### Already present

The current codebase already contains a meaningful base:

- `task_comments` table exists.
- Task comments already support:
  - `parent_comment_id`;
  - `comment_type`;
  - `visibility`;
  - `review_relevance`;
  - `@mention` parsing and mention storage;
  - mention notifications via `TASK_MENTIONED`.
- Task detail UI already has a discussion tab.
- Review zone card already exists on task detail.
- Dispute room already supports:
  - comments;
  - evidence;
  - report to admin.
- Reverse reviews already support targets and read surfaces, but that runtime reflects the older task-level assumption and must be revised in implementation.
- Organization show page already loads basic organization review summary.

### Current weaknesses

The flow is still fragmented:

1. Task comments exist but are not positioned as a first-class review/dispute artifact across all surfaces.
2. The review zone is mostly presentational and not fully aligned with review governance.
3. `ConfirmReviewCommand` still contains an older direct dispute creation path, while the dispute module already has a richer canonical flow.
4. Dispute room is stronger than the confirm entry point, so behavior can drift.
5. Frontend copy and navigation do not clearly express:
   - quorum requirements;
   - creator review requirement;
   - when profile updates are blocked;
   - that reverse review should move out of the task review page and into sprint-close flow;
   - when organization review data matters.
6. Organization review display is still shallow compared with the product intent.

## Decision: should task comments become a separate module?

### Decision

No, not in this phase.

### Reasoning

Task comments are currently coupled to:

- task authorization;
- task completion package access;
- organization-scoped mention resolution;
- review relevance;
- dispute case file snapshots;
- task timeline semantics.

Extracting them now would add more architectural surface without enough reuse. The product request is not for a generic social system. It is for stronger task-to-review-to-dispute governance. Keeping comments inside `tasks` is the lowest-risk and most aligned choice.

This also preserves a clean semantic split:

- task comments stay as work-context discussion on the task itself;
- dispute exchange stays as formal argument after review has been challenged.

### Future extraction trigger

Extraction becomes worth considering only if comments must be reused across at least two additional domains with shared capabilities such as:

- shared threaded discussion UI;
- cross-domain mentions and subscriptions;
- unified moderation policy;
- reusable notification fan-out;
- common search/indexing.

## Target architecture

### Domain boundaries

#### `tasks`

Owns:

- task comments;
- task comment mentions;
- task comment CRUD;
- comment review relevance;
- task detail discussion surface;
- review zone read model for task detail.

#### `reviews`

Owns:

- review sessions;
- reviewer assignments;
- quorum rules;
- review submission;
- reviewee confirmation;
- dispute lifecycle;
- dispute room;
- dispute escalation;
- dispute case file generation;
- reverse reviews;
- reverse review target aggregate statistics.

#### `organizations`

Owns read models and presentation for:

- organization review summary;
- organization reverse review governance summary;
- recent organization reverse review feed.

#### `notifications`

Continues to own delivery and persistence for:

- task mention notifications;
- reverse review target notifications;
- dispute escalation notifications.

## End-to-end workflow

### 1. Task comments

Any actor who can access the task completion package may comment on the task.

Supported behavior:

- write comment;
- edit own comment;
- soft-delete own comment;
- reply to existing comment;
- use `@username` mentions;
- mark comment as review-relevant.

Mention rules:

- only users in the same organization can be resolved by username;
- duplicate mentions in one comment collapse to one mention row;
- editing a comment updates mention rows;
- newly added mentions trigger notifications;
- already-existing mentions should not be re-notified on edit.

Review relevance rules:

- `review_relevance = true` means the comment can be surfaced as review/dispute context;
- `comment_type = review_note` should default to `review_relevance = true`;
- review-relevant comments remain task comments, not copied into dispute comments.

Task comments are for:

- work updates;
- clarifications;
- blockers;
- technical notes;
- proof of what happened during execution.

They are not the formal place where the two sides argue about the review result.

### 2. Task moves to `done`

When a task is completed and satisfies submission rules, the system exposes or creates a review zone.

The review zone must show:

- submission state;
- review session state;
- current reviewer assignment progress;
- whether creator review is still pending;
- dispute status if any.

### 3. Review session creation and assignments

Review session creation remains tied to completed `task_assignment`.

The canonical requirements become:

- minimum manager reviews: `1`;
- minimum peer reviews: `2`;
- creator review required: `true`;
- completed quorum only when all three conditions are satisfied.

If creator and manager are the same person:

- creator obligation still counts as required;
- session still requires creator completion and manager minimum;
- one reviewer may satisfy both identities if the same actor is intentionally allowed by assignment logic.

If creator is absent or invalid:

- session creation must resolve an effective creator reviewer through existing fallback logic;
- if no effective creator reviewer can be derived, session should remain actionable but surface governance warning in UI and observability.

### 4. Review submission

Manager and peer reviewers submit skill reviews as today, but session completion must align strictly with quorum.

Session should not become `completed` unless all are true:

- manager minimum satisfied;
- peer minimum satisfied with at least 2 peer reviews;
- creator review completed.

The task review zone should explain why the session is still pending when one of those gates is missing.

### 5. Reviewee decision

Once the session reaches `completed`, the reviewee sees exactly two governance actions:

- confirm;
- dispute.

#### Confirm

`confirmed` means:

- review outcome is accepted;
- downstream profile/trust/scoring pipeline may proceed;
- reverse review remains available after confirmation.

#### Dispute

`disputed` means:

- session moves into dispute governance;
- profile materialization for the reviewee remains blocked;
- dispute record is created through the canonical dispute flow;
- reviewee lands in the dispute exchange room.

### 6. Canonical dispute flow

Dispute creation must be canonicalized so the richer dispute module becomes the only authoritative path.

#### Required behavior

- `ConfirmReviewCommand` must no longer contain an isolated mini-dispute implementation.
- If the reviewee chooses `disputed`, the system must delegate to canonical dispute creation behavior.
- One dispute per active review session at a time.

Canonical dispute record stores:

- `review_session_id`;
- `task_assignment_id`;
- `task_id`;
- `reviewee_id`;
- `opened_by`;
- `dispute_reason`;
- `requested_outcome`;
- structured dispute details when provided.

### 7. Dispute exchange room

The dispute exchange room becomes the standard place for the two sides to argue, respond, and prove or challenge the review.

Actors:

- reviewee;
- the reviewer side;
- organization responder;
- system admin later in escalation flow.

Capabilities:

- support explicit two-sided argument between reviewee and reviewer side;
- exchange dispute comments;
- add evidence;
- inspect task context;
- inspect review-relevant task comments;
- report to admin if local resolution fails.

#### Two-sided argument model

The dispute UX must not feel like loose comments scattered across the page. It should behave like a dedicated bilateral exchange room where:

- the reviewee can state claims, rebuttals, and requests for correction;
- the reviewer side can answer, defend reasoning, and provide counter-evidence;
- each side can respond multiple times before escalation;
- the history remains visible as a chronological argument trail for admin review.

This does **not** require a new table model if existing dispute comments can already support it cleanly. The product requirement is behavioral and presentational:

- dispute conversation must be visibly separate from task comments;
- it must read like an active case discussion between two sides;
- it must preserve enough structure for later case-file and admin investigation.

Entry rule:

- the dispute exchange room only exists after the reviewee explicitly opens a dispute from the completed review state.

#### Relationship between task comments and dispute comments

- task comments describe work context over the lifetime of the task;
- dispute comments describe explicit dispute conversation;
- both should appear in the dispute experience, but as separate streams.

This distinction is mandatory:

- task comments may be pulled into dispute resolution as supporting context;
- dispute comments are the official exchange between the two sides after the review has been challenged.

Presentation rule:

- dispute exchange room primary discussion tab shows the two-sided dispute conversation;
- review-related task comments appear in a supporting panel or evidence tab;
- case file snapshots include both.

### 8. Report dispute to admin

If dispute participants cannot resolve the issue, reviewee may escalate.

Report behavior:

- dispute status becomes `admin_reviewing`;
- escalation reason is stored;
- reviewee gets confirmation notification;
- system admins get escalation notification;
- admin surfaces list the dispute as ready for investigation.

Escalation should be available only when:

- dispute is still active;
- dispute is not already reported;
- actor is the reviewee.
- there has already been real exchange between the two sides in the dispute room.

### 9. Admin resolution

No domain change in principle:

- admin remains the final authority;
- AI remains advisory only;
- case file remains the authoritative investigation snapshot.

What improves in this phase is evidence quality:

- task comments with review relevance are consistently included;
- organization response and dispute discussion are easier to inspect;
- frontend admin flow is less detached from the real review context.

### 10. Reverse reviews

Reviewee may submit reverse review for:

- manager;
- peer;
- project;
- organization.

Reverse reviews remain feedback artifacts and must **not** directly alter:

- skill review scores;
- dispute verdicts;
- review confirmation state.

But reverse reviews must contribute to target-facing statistics used by UI and governance.

#### Target stats

For each reverse-review target, the system should expose:

- total reviews;
- average rating;
- anonymous review count;
- recent comments;
- optional recent activity timestamp.

Targets:

- user targets: manager, peer;
- project target;
- organization target.

### 11. Organization review display

Organization detail should show:

- total organization reviews;
- average rating;
- anonymous count;
- recent reverse reviews addressed to the organization;
- aggregate counts by reverse-review target type across the organization;
- clear navigation to reverse review center.

This page should communicate that organization review is a governance signal derived from task review experiences, not a generic public rating widget.

## Required backend changes

### A. Canonicalize dispute creation from confirmation

Refactor `ConfirmReviewCommand` so that:

- it no longer inserts dispute rows using an isolated legacy path;
- it delegates to canonical dispute creation behavior or shared service;
- it preserves confirmation history semantics;
- it keeps cache invalidation and audit behavior correct.

Preferred approach:

- extract shared dispute-start logic used by both:
  - direct dispute creation endpoint;
  - review confirmation action `disputed`.

### B. Tighten quorum enforcement

Review session completion must be based on explicit quorum logic:

- `minimum_manager_reviews = 1`;
- `minimum_peer_reviews = 2`;
- `creator_review_completed = true`.

Any older shortcut that allows completion before creator completion must be removed or aligned.

### C. Strengthen task comment read model

Task comment API should remain in `tasks`, but the read model should support:

- nested or reply-aware display using `parent_comment_id`;
- mentions in serialized response;
- `review_relevance` in all relevant surfaces;
- efficient filtering for review-relevant comments used in dispute/review panels.

### D. Reuse task comments in review/dispute surfaces

Add or strengthen read queries so review/dispute pages can load:

- all review-relevant task comments for the related task;
- author info;
- mentions;
- edit state;
- timestamps.

### E. Reverse review target stats

Ensure target stats are consistently recalculated and exposed for:

- manager;
- peer;
- project;
- organization.

This likely means strengthening existing stats readers rather than redesigning the table model.

### F. Notifications

Ensure the following notifications remain consistent:

- `TASK_MENTIONED`;
- `REVERSE_REVIEW_RECEIVED`;
- `ORGANIZATION_REVIEW_RECEIVED`;
- `REVIEW_DISPUTE_ESCALATED`.

## Required frontend changes

### A. Task detail page

Strengthen:

- discussion tab;
- review zone card.

#### Discussion tab

Must clearly support:

- create comment;
- reply context;
- edit own comment;
- delete own comment;
- mention awareness;
- review relevance toggle;
- better distinction between normal discussion and review-related notes.

The UI should make clear that:

- this is task discussion;
- these comments may later support review or dispute;
- this is still different from formal dispute exchange.

#### Review zone card

Must clearly show:

- submission state;
- review session state;
- dispute state;
- manager count;
- peer count;
- creator review requirement;
- pending required reviewers;
- pending optional reviewers;
- navigation to review session or dispute room.

### B. Review show page

Improve:

- confirmation panel copy;
- visibility of creator-review requirement;
- visibility of reverse review targets;
- explanation of what happens on confirm vs dispute.

### C. Dispute show page

Must make clear:

- this is the canonical two-side argument room;
- task comments marked for review are context evidence, not the main dispute chat;
- report-to-admin is a last-step escalation;
- status badges align with real backend states.

Tabs should remain conceptually separated:

- overview;
- discussion between the two sides;
- evidence;
- organization response or escalation controls.

The discussion surface should feel like a real dispute thread:

- each message clearly identifies which side is speaking;
- both sides can reply multiple times;
- chronology is obvious;
- escalation control appears only after the room has already been used for actual exchange.
- the room is only reachable after dispute creation, not during normal task discussion.

### D. Organization show page

The organization review tab should feel complete enough to support governance reading:

- summary cards;
- recent organization reviews;
- anonymous counts;
- reverse-review governance counts by target type;
- route to reverse review center.

## Data model impact

### No new top-level comment module

No new module is added for comments in this phase.

### Existing tables expected to remain primary

- `task_comments`
- `task_comment_mentions`
- `review_sessions`
- `review_session_reviewer_assignments`
- `review_disputes`
- `review_dispute_comments`
- `review_dispute_evidences`
- `review_dispute_case_files`
- `reverse_reviews`
- `notifications`

### Migration expectations

This phase should avoid broad schema redesign unless current runtime depends on missing columns.

Potential migration only if required by current drift:

- add missing dispute escalation fields if not guaranteed in migrations but already used by runtime;
- add indexes for task comment lookups if review/dispute panels become slow.

## API and route expectations

### Keep existing surfaces where possible

Task comment APIs already exist and should remain authoritative:

- list comments;
- create comment;
- update comment;
- delete comment.

Dispute APIs already exist and should remain authoritative:

- create dispute;
- list/create dispute comments;
- list/create dispute evidences;
- report dispute;
- org respond.

### Behavioral alignment over route churn

This phase should prefer:

- route stability;
- response contract alignment;
- shared domain behavior.

It should avoid unnecessary path renames.

## Error handling and policy expectations

### Task comments

Reject when:

- body is empty;
- parent comment belongs to another task;
- actor cannot access the task completion package.

### Review completion

Reject or keep pending when:

- creator review missing;
- manager minimum missing;
- peer minimum below 2.

### Dispute

Reject when:

- actor is not reviewee for dispute creation or report;
- dispute already active;
- dispute already reported;
- dispute no longer active.

### Reverse review

Reject when:

- target does not belong to the session context;
- duplicate target feedback exists in same session;
- rating is outside allowed range.

## Observability and audit expectations

Maintain or strengthen:

- audit events for task comment mutations when appropriate;
- audit events for review confirmation;
- audit events for dispute creation;
- audit events for dispute report/escalation;
- audit events for reverse review creation.

Platform workflow events should remain aligned with:

- review submission;
- dispute creation;
- dispute response;
- dispute escalation.

## Testing strategy

### Backend tests

Add or strengthen tests for:

1. task comment create/update/delete with mentions;
2. mention notifications only for newly added mentions;
3. review-relevant task comments loading into review/dispute support panels;
4. review session quorum requiring:
   - manager;
   - 2 peers;
   - creator completion;
5. dispute creation through reviewee confirmation path uses canonical dispute behavior;
6. reporting dispute sends admin notification and updates status;
7. reverse review stats for:
   - user target;
   - project target;
   - organization target.

### Frontend tests

Add or strengthen tests for:

1. task discussion tab rendering and comment mutation behavior;
2. review zone card state display;
3. review confirmation panel choices and copy;
4. dispute page showing dedicated two-side discussion flow;
5. dispute page showing review-related task comments as support evidence;
6. organization review tab rendering summaries and recent reviews.
7. dispute report button staying unavailable until there has been real exchange in the dispute room.

## Rollout plan

### Phase 1

- refactor canonical dispute creation;
- tighten review quorum behavior;
- keep existing surfaces stable.

### Phase 2

- strengthen task comment UX and review relevance presentation;
- strengthen review page and dispute page.

### Phase 3

- improve organization review display;
- verify reverse review stats across targets.

## Risks

1. The repo already has partially overlapping implementations for dispute creation.
   - Refactor must avoid creating double-dispute rows.

2. Creator review semantics may overlap with manager reviewer semantics.
   - Quorum logic must be explicit and tested.

3. Frontend already exposes pieces of the target flow.
   - We must avoid introducing contradictory copy or state assumptions.

4. The database schema may have migration drift versus runtime assumptions.
   - We must verify any columns used by escalation/runtime code before shipping.

## Recommendation

Implement this as a domain-alignment refactor, not a new comment module.

That means:

- keep task comments in `tasks`;
- make review zone stronger;
- make dispute flow canonical;
- treat task comments as governance context;
- strengthen reverse review and organization review surfaces.

This gives the requested user experience without creating an oversized architectural detour.
