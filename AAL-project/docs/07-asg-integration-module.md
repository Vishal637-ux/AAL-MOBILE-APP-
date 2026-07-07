# Module: ASG Integration (Parent App Sync)

## Purpose
Exposes intern onboarding progress to the parent Apex Startup Group (ASG) app, via both a pollable REST API and real-time webhooks.

## Dependencies
- Reads across `users`, `lms_enrollments`, `interviews`, `project_allocations`
- Triggered by every module that changes `onboarding_step` (Auth, LMS, Interview, Project Allocation, Admin skip)

## Data Models
No new tables. This module is a read/aggregation + event-dispatch layer.

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/asg/student/:id/summary` | ASG pulls full student progress snapshot |
| POST | (outbound) `<ASG_WEBHOOK_URL>` | AAL pushes step-change event to ASG |

## Core Logic / Flow

### REST Pull
```json
GET /api/asg/student/:id/summary
{
  "student": { "name": "...", "email": "...", "college": "...", "degree_year": "..." },
  "onboarding_step": "INTERVIEW_DONE",
  "lms_progress": [
    { "course_name": "AI Basics", "completion_percent": 100, "completed": true }
  ],
  "interview": { "status": "completed", "result": "pass" },
  "project": { "title": "NLP Chatbot v2", "allocated_at": "2024-09-01" }
}
```

### Webhook Push
- Fired on every `onboarding_step` change, from any module
- Signed with HMAC-SHA256 shared secret header, so ASG can verify authenticity
- ASG updates its own dashboard in real time on receipt

## Edge Cases & Error Handling
- ASG webhook endpoint is down/unreachable → retry with backoff (e.g. 3 attempts), then log failure — **don't block the originating module's step transition** on webhook delivery success
- HMAC signature mismatch on ASG's end → not AAL's concern to handle, but log outbound payload for debugging disputes
- Student summary requested for non-existent ID → 404
- Partial data (e.g. student has no interview yet) → return `null`/omit rather than error, so ASG can render "not yet reached" states

## Folder Structure
```
server/src/services/asg-webhook.service.js
server/src/routes/asg.routes.js
server/src/controllers/asg.controller.js
```

## Testing Checklist
- [ ] Summary endpoint returns correct aggregated data across all modules
- [ ] Webhook fires on every step-change event (from all modules, not just one)
- [ ] Webhook includes valid HMAC signature
- [ ] Webhook retry logic works on simulated ASG downtime
- [ ] Failed webhook delivery doesn't block the actual onboarding step update
