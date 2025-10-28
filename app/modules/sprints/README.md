# Sprints Module

Owns project sprint backlog operations.

- `actions/commands`: write-side sprint workflow actions.
- `actions/queries`: read-side sprint board queries.
- `bootstrap`: factories used by controllers and public APIs.
- `public_contracts`: stable imports for other modules.

Sprint domain follows Scrum shape: Sprint Goal/backlog belongs to one project, backlog tasks can move into editable sprints (`draft` or `active`), and completed sprint work is separated from carry-over work.
