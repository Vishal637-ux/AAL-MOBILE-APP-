# Module: Project Allocation & Tenon SSO

## Purpose
Assigns projects to students post-interview, grants SSO access to Tenon (internal project tool), and unlocks the next LMS course set.

## Dependencies
- Interview module (`onboarding_step = INTERVIEW_DONE` + result = pass required)
- LMS Integration module (unlocking new course set is a shared action)
- Supabase Admin SDK (Tenon SSO)

## Data Models

**`projects`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | TEXT | |
| tenon_project_id | TEXT | Reference ID in Tenon/Supabase |
| created_by | UUID FK -> users | |

**`project_allocations`**
| Column | Type | Notes |
|---|---|---|
| user_id | UUID FK -> users | |
| project_id | UUID FK -> projects | |
| allocated_by | UUID FK -> users | Admin |
| allocated_at | TIMESTAMPTZ | |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/projects/allocate` | Allocate project to student |
| GET | `/api/sso/tenon-token` | Generate Tenon SSO magic link |
| GET | `/api/student/project` | Student: view allocated project |

## Core Logic / Flow

### Allocation
1. Admin creates a project with a `tenon_project_id`
2. Admin allocates project to a student (requires `INTERVIEW_DONE` + pass result)
3. On allocation: `onboarding_step = PROJECT_ALLOCATED`, then immediately `ACTIVE` once Tenon + LMS unlock succeed
4. Second LMS course set is unlocked simultaneously (calls into LMS module's enrollment function)

### Tenon SSO Flow
1. Student clicks "Open Tenon"
2. AAL backend calls Supabase Admin API: `supabase.auth.admin.generateLink({ type: 'magiclink', email })`
3. Redirect student to magic link URL → Tenon auto-authenticates
4. **Alternative:** AAL issues custom JWT signed with `SUPABASE_JWT_SECRET`; Tenon validates via `supabase.auth.setSession({ access_token })`

## Edge Cases & Error Handling
- Allocation attempted on a student who hasn't passed interview → reject with 403
- Tenon magic link generation fails (Supabase API down) → student sees error, admin notified, retry mechanism needed
- Project has no `tenon_project_id` set → block allocation, force admin to complete project setup first
- Student allocated to a project, but LMS course unlock fails → **needs decision**: is `PROJECT_ALLOCATED` step rolled back, or does Tenon access proceed independently of LMS unlock success? Recommend decoupling these into independently retryable actions rather than one atomic step.

## Folder Structure
```
server/src/services/tenon.service.js
server/src/routes/sso.routes.js
server/src/controllers/project.controller.js
client/src/pages/student/Project.jsx
client/src/pages/admin/ProjectAllocator.jsx
```

## Testing Checklist
- [ ] Allocation blocked without passing interview result
- [ ] Tenon magic link SSO works end-to-end
- [ ] Second LMS course set enrolls correctly on allocation
- [ ] Allocation without `tenon_project_id` is blocked
- [ ] Partial failure (Tenon succeeds, LMS unlock fails) is logged and recoverable
