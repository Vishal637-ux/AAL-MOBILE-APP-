# Module: LMS Integration (Moodle SSO + Progress Sync)

## Purpose
Provides seamless SSO into Moodle, enrolls students into courses, and keeps course completion status synced back into AAL.

## Dependencies
- Auth & Onboarding module (reads/writes `onboarding_step`, `moodle_user_id`)
- Moodle REST API (external)
- node-cron (scheduled sync job)

## Data Models

**`lms_enrollments`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK -> users | |
| moodle_course_id | INT | Moodle's internal course ID |
| course_name | TEXT | |
| enrollment_date | TIMESTAMPTZ | |
| completion_percent | NUMERIC | 0–100 |
| completed | BOOLEAN | |
| completed_at | TIMESTAMPTZ | Nullable |
| last_synced | TIMESTAMPTZ | Set by cron job |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/lms/progress` | Student's LMS course progress |
| GET | `/api/sso/moodle-token` | Generate Moodle SSO redirect URL |
| POST | `/api/admin/lms/enroll` | Admin: enroll student(s) in a course |
| POST | `/api/admin/lms/course-setup` | Admin: link Moodle course ID to onboarding stage |

## Core Logic / Flow

### SSO Flow
1. Student clicks "Open LMS" in AAL
2. AAL backend generates 5-min signed JWT (HS256): `{ iss: 'aal', sub: user_email, exp: now+5min, name, role }`
3. Redirect to `https://moodle.domain.com/auth/oauth2/login.php?token=<jwt>`
4. Moodle's custom auth plugin validates JWT via shared secret
5. Moodle creates/finds user, starts session, lands student on dashboard

### Provisioning (server-to-server via Moodle REST API)
- `core_user_create_users` — create Moodle account
- `enrol_manual_enrol_users` — enroll in course
- `core_completion_get_course_completion_status` — pull progress

### Sync Job (node-cron, every 15 minutes)
```
For each enrolled student with moodle_user_id:
  GET core_completion_get_course_completion_status (userid, courseid)
  → parse completion_percent + completed flag
  → UPSERT lms_enrollments
  → IF completed AND onboarding_step = 'LMS_ENROLLED':
      UPDATE onboarding_step = 'LMS_COMPLETED'
      Fire webhook → ASG App
```

## Edge Cases & Error Handling
- Moodle API timeout/down during sync → log failure, retry next cycle, don't crash the cron job for other students
- Student has no `moodle_user_id` yet (not provisioned) → skip in sync loop
- JWT expires before Moodle redirect completes (>5 min) → Moodle rejects, student sees SSO error, needs "Open LMS" retry
- Completion percent regresses (Moodle data inconsistency) → log anomaly, don't auto-revert `onboarding_step`

## Folder Structure
```
server/src/services/moodle.service.js
server/src/services/lms-sync.service.js
server/src/services/sso.service.js
server/src/jobs/lms-progress-sync.job.js
server/src/routes/lms.routes.js
server/src/routes/sso.routes.js
client/src/pages/student/LMSPortal.jsx
client/src/components/lms/CourseCard.jsx
client/src/components/lms/ProgressBar.jsx
client/src/components/lms/LMSLauncher.jsx
client/src/hooks/useLMSProgress.js
client/src/hooks/useSSO.js
client/src/utils/ssoRedirect.js
```

## Testing Checklist
- [ ] JWT generated and validated correctly by Moodle plugin
- [ ] Moodle account auto-created on first LMS access
- [ ] Enrollment via REST API succeeds
- [ ] Cron job upserts `lms_enrollments` correctly
- [ ] Completion triggers `onboarding_step` update + webhook
- [ ] Sync job handles Moodle API downtime gracefully (no crash)
