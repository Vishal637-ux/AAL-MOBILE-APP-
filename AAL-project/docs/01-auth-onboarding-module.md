# PRD: AAL (Apex AI Lab) Intern Onboarding Platform

**Version:** 1.0
**Status:** Draft for Review
**Author:** Product/Architecture Team - ASG

---

## 1. Problem Statement

Apex Startup Group has no unified system to move students/interns from initial application through course completion, interview, and project assignment — the process today is manual, fragmented across ad-hoc tools, and gives Super Admins no single view of where each intern is stuck.

## 2. Target Users

| Persona | Description | Primary Need |
|---|---|---|
| **Student/Intern** | Applicant progressing through onboarding | A single place to register, learn, interview, and get to work |
| **Admin** | Reviews responses, schedules interviews, sets up courses | Tools to manage cohorts without manual back-and-forth |
| **Super Admin** | Oversees the whole pipeline | Full control (including skipping steps) + bird's-eye visibility |
| **ASG Parent App** (system consumer) | Not a human user, but a downstream system | Real-time / pollable view of every intern's progress |

## 3. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Remove manual onboarding admin work | Time from registration → project allocation reduced (baseline TBD, target: same-day step transitions where no human bottleneck exists) |
| Give leadership visibility | 100% of intern progress reflected in ASG app within 15 min of any status change |
| Reduce dropped/stuck applicants | 0 students permanently stuck due to system limitation (Super Admin can always unblock via skip) |
| Reliable LMS tracking | Course completion sync accuracy ≥ 99% against Moodle source of truth |

## 4. Scope

### Must-have (v1)
- Student registration & profile capture (name, email, WhatsApp, college, degree/year, DOB, gender, blood group)
#### `users`
```sql
id UUID PK, email TEXT UNIQUE, name TEXT, whatsapp TEXT,
college_name TEXT, degree_name TEXT, degree_year TEXT,
dob DATE, gender TEXT, blood_group TEXT,
role TEXT (student | admin | super_admin),
onboarding_step TEXT, moodle_user_id INT,
password_hash TEXT, created_at TIMESTAMPTZ
```

#### `onboarding_log`
```sql
id UUID PK, user_id UUID FK→users, step TEXT,
status TEXT (completed|skipped|pending),
skipped_by UUID FK→users (nullable),
notes TEXT, timestamp TIMESTAMPTZ
```
- AI knowledge questionnaire (admin-configurable, MCQ/text/rating)
- SSO into Moodle LMS; auto-enrollment in "AI Basics" course
- LMS progress sync (polling, every 15 min) back into AAL
- Interview scheduling (online/offline, 1-on-1/group) + result recording
- Project allocation + SSO into Tenon workspace
- Second LMS course set unlocked at project allocation
- Super Admin: skip any single step or all steps, with audit log
- Super Admin: questionnaire builder, LMS course setup, interview manager, project allocator
- Bird's-eye dashboard (filter by step/college/year/interview result, bulk actions)
- ASG integration: REST pull endpoint + webhook push on step change

### Nice-to-have (v2)
- Email/WhatsApp notifications on step transitions
- Self-serve interview slot booking (calendar-based) instead of admin-assigned
- Analytics dashboard (drop-off rates per step, time-in-step)
- Role-based fine-grained permissions beyond admin/super_admin

### Out of scope (v1)
- Payments/stipend management
- Alumni tracking post-"ACTIVE" status
- Mobile native app (web-responsive only)
- Multi-tenant support for organizations outside ASG

## 5. Core User Stories

1. As a **student**, I want to register and complete my profile, so that I can begin onboarding without needing an admin to set me up manually.
2. As a **student**, I want to take the AI knowledge questionnaire, so that admins understand my starting skill level.
3. As a **student**, I want single sign-on into the LMS from AAL, so that I don't need separate credentials for Moodle.
4. As a **student**, I want my LMS progress and course completion reflected automatically, so that I don't have to self-report or wait on manual updates.
5. As a **student**, I want to see my interview schedule and result, so that I know what's next.
6. As a **student**, I want SSO access to Tenon once a project is allocated, so that I can start working immediately.
7. As an **admin**, I want to build and edit questionnaires, so that assessments can evolve without engineering changes.
8. As an **admin**, I want to schedule interviews and assign interviewers, so that the interview pipeline runs smoothly.
9. As an **admin**, I want to allocate projects to students, so that they get Tenon access and the next LMS course set in one action.
10. As a **super admin**, I want to skip any onboarding step for any student, so that edge cases (manual overrides, special admits) don't block the pipeline.
11. As a **super admin**, I want a bird's-eye view of all students, so that I can spot bottlenecks and take bulk action.
12. As the **ASG app**, I need to pull or receive real-time onboarding status per student, so that leadership has one unified view across ASG.

## 6. Technical Requirements

*(Derived from the existing technical architecture document — summarized here; full detail lives in that doc.)*

**Stack:** React 18 + Vite (frontend), Node.js + Express (backend), PostgreSQL 15 (database). Integrates with Moodle LMS and Tenon (React + Supabase).

**Data models:** `users`, `onboarding_log`, `questionnaires` / `questions`, `lms_enrollments`, `interviews`, `projects` / `project_allocations` — see architecture doc §4 for full schema.

**Onboarding state machine (9 stages):**
`REGISTERED → PROFILE_COMPLETE → QUESTIONNAIRE_DONE → LMS_ENROLLED → LMS_COMPLETED → INTERVIEW_SCHEDULED → INTERVIEW_DONE → PROJECT_ALLOCATED → ACTIVE`

**SSO:** AAL backend acts as Identity Provider issuing short-lived (5-min) HS256 JWTs. Moodle validated via custom auth plugin; Tenon via Supabase magic-link/JWT.

**LMS sync:** node-cron job every 15 minutes polling Moodle's `core_completion_get_course_completion_status`.

**ASG integration:** REST pull (`GET /api/asg/student/:id/summary`) + HMAC-SHA256-signed webhook push on every step change.

**Non-functional requirements:**
- Audit logging on every Super Admin override (who, when, what, optional note)
- Short-lived SSO tokens (5 min) to limit exposure
- 15-minute sync interval is acceptable latency for LMS progress (not real-time)
- Dockerized for one-command local dev and straightforward production deploy

## 7. Risks & Open Questions

| Risk / Question | Notes |
|---|---|
| Moodle custom auth plugin complexity | Requires Moodle-side plugin development/maintenance — confirm who owns this and Moodle hosting (cloud vs self-hosted) |
| Supabase JWT secret sharing with Tenon | Needs secure secret management/rotation plan |
| 15-min sync latency | Acceptable for course completion, but confirm no student-facing flow needs real-time LMS status |
| Single active questionnaire assumption | `is_active` flag implies only one live questionnaire at a time — confirm this matches intended admin workflow (e.g., cohort-specific questionnaires?) |
| Skip logic and downstream provisioning | Skipping to `LMS_ENROLLED` auto-creates a Moodle account — need to confirm all skip-triggered side effects are idempotent/safe to skip backward too |
| Data privacy | DOB, gender, blood group are sensitive fields — confirm compliance requirements (consent, storage, access control) |

## 8. Milestones

*(Aligned to the technical roadmap already defined)*

| Phase | Timeline | Deliverables |
|---|---|---|
| 1 | Week 1–2 | Auth, profile form, PostgreSQL schema & migrations |
| 2 | Week 3 | Questionnaire builder (admin) + submission (student) |
| 3 | Week 4–5 | Moodle SSO integration, enrollment via REST API |
| 4 | Week 5 | LMS progress sync cron job; progress on student dashboard |
| 5 | Week 6 | Interview scheduling module (admin + student view) |
| 6 | Week 7 | Tenon SSO, project allocation, second LMS course set |
| 7 | Week 8 | Super Admin skip logic, bird's-eye dashboard, audit log |
| 8 | Week 9 | ASG API + webhook integration, end-to-end testing, deployment |

---
*This PRD sits above the existing "AAL Technical Architecture Document" — use that doc for schema/API/implementation detail; use this PRD for scope, priorities, and stakeholder alignment.*
