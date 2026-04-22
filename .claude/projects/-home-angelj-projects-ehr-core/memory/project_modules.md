---
name: ehr-core module build status
description: Tracks which PRD modules have been built in ehr-core (ClinicaMVP)
type: project
---

Modules built per PRD section 9 order:

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Setup + DB schema + Docker | ✅ Done | |
| 2 | Auth (JWT, middleware) | ✅ Done | |
| 3 | Dashboard layout + nav | ✅ Done | |
| 4 | Patients (CRUD + search) | ✅ Done | |
| 5 | Medical history | ✅ Done | |
| 6 | Appointments (CRUD + calendar) | ✅ Done | |
| 7 | Clinical notes (SOAP + sign) | ✅ Done | |
| 8 | Attachments (R2 storage) | ✅ Done | |
| 9 | Audit log viewer | ✅ Done | |
| 10 | Dashboard (stats + today queue) | ✅ Done | |
| 11 | Settings (clinic + users + CSV import) | ✅ Done | papaparse installed for CSV parsing |
| 12 | Final permissions + hardening | ⬜ Pending | |
| 13 | E2E testing | ⬜ Pending | |

**Why:** Tracking build order to know what's been implemented vs what remains.
**How to apply:** When asked to continue building, start from the next pending module.

Routes added in module 11:
- `/configuracion` — clinic settings form + admin links
- `/configuracion/usuarios` — user management (create/edit/reset password/deactivate)
- `/configuracion/importar` — CSV patient import with column mapping

Actions added: `createUser`, `updateUser`, `resetUserPassword`, `updateClinicSettings`, `importPatients`
