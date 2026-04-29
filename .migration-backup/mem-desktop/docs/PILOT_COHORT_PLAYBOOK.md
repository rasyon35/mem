# Mem Desktop Pilot Cohort Playbook

## Goal
Run the first startup pilot with students, researchers, and small teams using the core local-first product loop.

## Cohort Structure
- 10-15 users total.
- Mix: 5 students, 5 researchers, 3-5 small-team users.
- Pilot duration: 14 days.

## Required User Journey
1. Activate account.
2. Ingest at least 3 sources.
3. Approve at least 1 staged update.
4. Open and edit at least 5 wiki pages.
5. Ask at least 3 page-context chat questions.

## KPI Source
Use local metrics endpoint:
- `GET /api/metrics/summary`

Primary counters:
- `frontend_ingest_completed`
- `frontend_approve_completed`
- `frontend_chat_completed`
- `frontend_page_opened`

## Success Criteria
- Activation: 70%+ of invited users complete setup and first ingest.
- Time-to-value: median under 10 minutes from first ingest to first approved page.
- Retention: 50%+ users active in week 2.
- Trust: 60%+ users open provenance sections during pilot.
- Quality: ingest failures under 10%.

## Weekly Review Ritual
- Monday: review KPI counts and top failure patterns.
- Wednesday: run user interviews (3-5 participants).
- Friday: ship one reliability and one UX improvement.
