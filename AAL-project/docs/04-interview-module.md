# Module: Interview Scheduling

## Purpose
Manages interview scheduling (online/offline, 1-on-1/group), interviewer assignment, and result recording.

## Dependencies
- Auth & Onboarding module (advances step to `INTERVIEW_SCHEDULED` then `INTERVIEW_DONE`)
- `users` table (interviewer_ids reference admin users)

## Data Models

**`interviews`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK -> users | Student |
| interview_type | TEXT | online \| offline |
| format | TEXT | one_on_one \| group |
| scheduled_at | TIMESTAMPTZ | |
| interviewer_ids | UUID[] | Array of admin user IDs |
| status | TEXT | scheduled \| completed \| cancelled |
| result | TEXT | pass \| fail \| hold |
| feedback | TEXT | Admin notes |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/interviews` | Create interview schedule |
| PUT | `/api/admin/interviews/:id` | Update schedule/status |
| PUT | `/api/admin/interviews/:id/result` | Record result + feedback |
| GET | `/api/student/interview` | Student: view own interview details |

## Core Logic / Flow
1. Student becomes eligible once `onboarding_step = LMS_COMPLETED`
2. Admin schedules interview: sets type, format, time, assigns interviewer(s) → `onboarding_step = INTERVIEW_SCHEDULED`
3. Interview happens; admin records `status = completed`, `result` (pass/fail/hold), and `feedback`
4. On result recorded → `onboarding_step = INTERVIEW_DONE`
5. `pass` result is what allows Project Allocation module to proceed (business rule — confirm if `hold`/`fail` need a re-interview path)

## Edge Cases & Error Handling
- Group interview with multiple students → **needs schema note**: current `interviews` table is per-student; a group interview likely needs shared `scheduled_at` + `interviewer_ids` across multiple rows, or a separate `interview_group_id`. Flag for architecture review.
- Interviewer double-booked → check `interviewer_ids` against existing `scheduled_at` slots before confirming (not in original spec — recommend adding)
- Result = `fail` or `hold` → what's the next step? Re-interview flow isn't defined in the state machine. **Open question for product.**
- Cancelled interview → student's `onboarding_step` should revert or stay at `LMS_COMPLETED` until rescheduled

## Folder Structure
```
server/src/routes/interview.routes.js
server/src/controllers/interview.controller.js
client/src/pages/student/Interview.jsx
client/src/pages/admin/InterviewManager.jsx
client/src/components/interview/InterviewCard.jsx
client/src/components/interview/ScheduleModal.jsx
```

## Testing Checklist
- [ ] Interview creation requires eligible student (LMS_COMPLETED)
- [ ] Multiple interviewers can be assigned
- [ ] Result recording advances onboarding step correctly
- [ ] Cancelled interview doesn't incorrectly advance step
- [ ] Fail/hold result path is handled (once defined)
