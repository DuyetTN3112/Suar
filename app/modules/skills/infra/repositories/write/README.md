# Write Operations

This folder contains persistence mutations owned by the Skills module.

`custom_skill_catalog_mutations.ts` serializes and persists catalog entries created from user
profile declarations or custom task requirements. Consumer modules own only their associations;
they delegate catalog identity and mutation to the Skills-owned capability and must not write the
`skills` table directly.
