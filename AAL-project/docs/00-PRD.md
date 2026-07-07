# AAL Project PRD

## Product Summary
AAL is a candidate learning and allocation platform that guides users from onboarding through questionnaires, LMS learning, interviews, project allocation, and ASG integration.

## Goals
- Provide a structured onboarding flow for candidates.
- Capture candidate profile, preferences, and readiness through questionnaires.
- Integrate learning progress from an LMS.
- Support interview scheduling, evaluation, and outcome tracking.
- Allocate candidates to suitable projects using eligibility and availability data.
- Give admins visibility and controls across the full workflow.
- Sync required data with ASG systems.

## Primary Users
- Candidate: registers, completes onboarding, learning, questionnaires, and interviews.
- Admin: configures flows, reviews progress, manages allocations, and monitors integrations.
- Interviewer: reviews candidate profiles and submits interview feedback.
- ASG operator/system: receives final allocation and candidate status data.

## Core Workflow
1. Candidate signs up and completes onboarding.
2. Candidate submits questionnaire responses.
3. Candidate learning progress is fetched or updated through LMS integration.
4. Candidate interview is scheduled and evaluated.
5. Allocation engine recommends or assigns a project.
6. Admin monitors and overrides where needed.
7. Final status is synced with ASG.

## Success Metrics
- Candidate onboarding completion rate.
- Questionnaire completion rate.
- LMS progress sync success rate.
- Interview completion and feedback submission time.
- Project allocation accuracy and override rate.
- ASG sync success and retry count.

## Non-Goals
- Building a full LMS from scratch.
- Replacing HR or payroll systems.
- Handling payment processing.

## Assumptions
- Authentication will use email/password initially, with room for SSO later.
- LMS and ASG APIs will be available with test credentials.
- Admin workflows need audit logs for sensitive actions.

## Risks
- External LMS or ASG API instability.
- Incomplete candidate data reducing allocation quality.
- Manual override requirements growing beyond initial admin dashboard scope.
