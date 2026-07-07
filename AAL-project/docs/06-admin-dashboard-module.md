# Module: Admin & Super Admin Dashboard

## Purpose
Central control surface for admins/super admins: manage the pipeline, override steps, and get a bird's-eye view of every student.

## Dependencies
- All other modules (this is primarily a UI/aggregation layer over Auth, Questionnaire, LMS, Interview, and Project modules)
- `onboarding_log` for audit trail

## Data Models
No new tables — this module reads/writes across `users`, `onboarding_log`, `questionnaires`, `lms_enrollments`, `interviews`, `projects`.

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/students` | List all students + current step, filterable |
| POST | `/api/admin/student/:id/skip` | Super Admin: skip onboarding step |
| GET | `/api/admin/student/:id` | Full detail view for one student |
| POST | `/api/admin/bulk/enroll` | Bulk-enroll a cohort to LMS |
| POST | `/api/admin/bulk/interview` | Schedule group interview for multiple students |

## Core Logic / Flow

### Skip Logic (Super Admin only)
1. Super Admin opens Student Detail view, selects target step
2. System writes new `onboarding_step` directly to `users`
3. Logs to `onboarding_log`: `skipped_by = admin_id`, optional `notes`
4. Triggers downstream provisioning for that step (e.g. skip → `LMS_ENROLLED` creates Moodle account via LMS module)
5. Emits step-change webhook to ASG app

### Bird's-Eye Dashboard
- Table view: all students, current step, LMS %, interview status
- Filters: step, college, degree year, interview result
- Bulk actions: enroll batch to LMS, schedule group interview

## Access Control
| Action | Admin | Super Admin |
|---|---|---|
| View dashboard | ✅ | ✅ |
| Review questionnaire responses | ✅ | ✅ |
| Schedule interviews | ✅ | ✅ |
| Allocate projects | ✅ | ✅ |
| Skip onboarding steps | ❌ | ✅ |
| Configure questionnaires | ❌ (view only) | ✅ |

## Edge Cases & Error Handling
- Skip to a step that requires provisioning, and provisioning fails → step should NOT be marked complete silently; surface the failure to the Super Admin in the UI, not just in logs
- Bulk action partially fails (e.g. 8/10 students enroll, 2 fail) → return per-student success/failure breakdown, not a single pass/fail response
- Non-super-admin attempts skip via direct API call → 403, and log the attempt

## Folder Structure
```
server/src/routes/admin.routes.js
server/src/middleware/role.middleware.js  (requireAdmin / requireSuperAdmin)
server/src/controllers/admin.controller.js
client/src/pages/admin/AdminDashboard.jsx
client/src/pages/admin/StudentDetail.jsx
client/src/components/admin/BirdsEyeView.jsx
client/src/components/admin/StudentTable.jsx
client/src/components/admin/SkipModal.jsx
```

## Testing Checklist
- [ ] Only Super Admin role can access skip endpoint
- [ ] Skip action correctly logs `skipped_by` and triggers provisioning
- [ ] Dashboard filters work correctly in combination (step + college + year)
- [ ] Bulk enroll returns per-student results, not all-or-nothing
- [ ] Regular admin cannot skip steps (403 enforced server-side, not just hidden in UI)
