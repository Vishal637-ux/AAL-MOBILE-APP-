# Module: Auth & Onboarding

## Purpose
Handles student registration, login, profile capture, and tracks each student's position in the 9-stage onboarding state machine.

## Dependencies
- PostgreSQL (`users`, `onboarding_log` tables)
- JWT service (shared across all modules for auth)
- Downstream: triggers provisioning in LMS module when step advances past `LMS_ENROLLED`

## Data Models

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| email | TEXT UNIQUE | Login identifier |
| name | TEXT | |
| whatsapp | TEXT | E.164 format |
| college_name | TEXT | |
| degree_name | TEXT | e.g. B.Tech CSE |
| degree_year | TEXT | e.g. Year 3 |
| dob | DATE | Must be 16+ |
| gender | TEXT | |
| blood_group | TEXT | |
| role | TEXT | student \| admin \| super_admin |
| onboarding_step | TEXT | Current stage (see below) |
| moodle_user_id | INT | Synced after Moodle account creation |
| password_hash | TEXT | bcrypt |
| created_at | TIMESTAMPTZ | |

**`onboarding_log`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK -> users | |
| step | TEXT | Stage name |
| status | TEXT | completed \| skipped \| pending |
| skipped_by | UUID FK -> users | Nullable, admin who skipped |
| notes | TEXT | Optional |
| timestamp | TIMESTAMPTZ | |

## Onboarding State Machine
```
REGISTERED → PROFILE_COMPLETE → QUESTIONNAIRE_DONE → LMS_ENROLLED
→ LMS_COMPLETED → INTERVIEW_SCHEDULED → INTERVIEW_DONE
→ PROJECT_ALLOCATED → ACTIVE
```

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Student registration |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/onboarding/me` | Current step & progress |
| PUT | `/api/onboarding/profile` | Submit profile fields |

## Core Logic / Flow
1. Student registers with email + password → `onboarding_step = REGISTERED`
2. Student fills profile form (name, WhatsApp, college, degree, DOB, gender, blood group) → validated → `PROFILE_COMPLETE`
3. Every step transition writes a row to `onboarding_log`
4. **Super Admin override:** writes new `onboarding_step` directly to `users`, logs to `onboarding_log` with `skipped_by`, and triggers any downstream provisioning tied to that step (e.g. jumping to `LMS_ENROLLED` fires Moodle account creation in the LMS module)
5. Every step change emits a webhook to ASG (handled by ASG Integration module, not here — this module just triggers the event)

## Validation Rules
| Field | Rule |
|---|---|
| Full Name | Required, 2–100 chars |
| Email | Required, unique, valid format |
| WhatsApp | Required, E.164 format |
| DOB | Must result in age 16+ |
| Gender | Male / Female / Non-binary / Prefer not to say |
| Blood Group | A+/A-/B+/B-/AB+/AB-/O+/O- |

## Edge Cases & Error Handling
- Duplicate email on registration → 409 Conflict
- DOB resulting in age < 16 → reject with validation error
- Skip to a step whose provisioning fails (e.g. Moodle API down) → log failure in `onboarding_log`, keep step unchanged, alert admin
- Invalid/expired JWT on `/onboarding/me` → 401, redirect to login

## Folder Structure
```
server/src/routes/auth.routes.js
server/src/routes/onboarding.routes.js
server/src/controllers/auth.controller.js
server/src/controllers/onboarding.controller.js
server/src/middleware/auth.middleware.js
client/src/pages/auth/Login.jsx
client/src/pages/auth/Register.jsx
client/src/pages/student/Profile.jsx
client/src/context/AuthContext.jsx
client/src/context/OnboardingContext.jsx
```

## Testing Checklist
- [ ] Register with valid data succeeds
- [ ] Register with duplicate email fails
- [ ] Register with age < 16 fails
- [ ] Login returns valid JWT
- [ ] Profile update persists all fields correctly
- [ ] Step transition writes correct `onboarding_log` entry
- [ ] Super Admin skip updates step + logs `skipped_by`
