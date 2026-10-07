# 360° Feedback — Frontend Implementation Plan

> Scope: `epms_frontend` (Vite + React 19 + Redux Toolkit Query + TypeScript)
> Pairs with: `epms_backend/360_FEEDBACK_MODIFIED_IMPLEMENTATION_PLAN.md`
> Existing files reviewed: `features/feedback360/feedback360Types.ts`, `features/feedback360/feedback360Api.ts`, `pages/feedback360/{Feedback360PendingPage, Feedback360ReportPage, Feedback360AdminPage}.tsx`, `routes/feedback360Routes.tsx`, `services/api.ts`.

---

## 0. Guiding Principles

1. **Frontend mirrors the four-source model** — Self / Direct Manager / Peers / Subordinates. No matrix concepts in UI.
2. **The frontend trusts the backend's anonymity layer** — never reveals evaluator identity for PEER/SUBORDINATE, but does not re-implement suppression logic; respects whatever the API returns.
3. **Optimistic UI only for draft saves** — submissions wait for backend confirmation (auth + validation rules live server-side).
4. **All forms are relationship-aware** — fetch the form for the request, never a "default" form picked client-side.
5. **No hardcoded weights or thresholds in UI** — read `ScoringPolicy` from the backend.
6. **Accessibility** — keyboard nav for star ratings, ARIA labels on anonymous chips, focus traps in modals.

---

## 1. Type Updates (`features/feedback360/feedback360Types.ts`)

### 1.1 Already aligned with backend

`FeedbackRelationship` enum already contains the canonical four values (`DIRECT_MANAGER`, `PEER`, `SUBORDINATE`, `SELF`) — no change needed.
`FeedbackStatus` enum already contains `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` — no change needed.

### 1.2 Additions / changes

```typescript
// Add to FeedbackRequestResponse
export interface FeedbackRequestResponse {
  // ...existing
  dueDate?:             string;       // ISO
  startedAt?:           string;       // ISO, present when draft exists
  lastReminderSentAt?:  string;
  formId?:              number;       // already optional — required now
  isOverdue?:           boolean;      // derived server-side
}

// Add per-relationship breakdown + gap + participation to summary
export interface FeedbackSummaryResponse {
  // ...existing fields kept
  selfVsOthersGap?:      CategoryGap[];
  participation?:        ParticipationStat[];
  managerSummary?:       string;
  calibratedFinalScore?: number | null;
  finalizedAt?:          string;
  finalizedBy?:          string;
}

export interface CategoryGap {
  categoryName:  string;
  selfScore:     number | null;
  othersScore:   number | null;
  gap:           number | null;   // self - others
}

export interface ParticipationStat {
  relationship:  FeedbackRelationship;
  requested:     number;
  submitted:     number;
  suppressed:    boolean;          // true if below threshold
}

// Competency tagging on Question
export interface QuestionDTO {
  // ...existing
  competencyId?:   number;
  competencyName?: string;
  weight?:         number;
}

// Form is relationship-aware
export interface FullFormResponse {
  // ...existing
  targetRelationship: FeedbackRelationship;
}

// Scoring policy (read-only on FE, edited in admin form)
export interface ScoringPolicy {
  id:                    number;
  cycleId:               number;
  jobLevelId?:           number;     // null = cycle default
  managerWeight:         number;
  peerWeight:            number;
  subordinateWeight:     number;
  selfWeight:            number;
  includeSelfInFinal:    boolean;
  suppressionThreshold:  number;
}

// Draft save payload
export interface FeedbackDraftRequest {
  requestId:       number;
  overallComment?: string;
  responses:       FeedbackResponseRequest[];
}

// Nomination (Phase 4)
export type NominationStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED';

export interface EvaluatorNomination {
  id:            number;
  targetUserId:  number;
  nomineeId:     number;
  nomineeName:   string;
  relationship:  FeedbackRelationship;
  status:        NominationStatus;
  nominatedById: number;
  approvedById?: number;
}
```

---

## 2. RTK Query Additions (`features/feedback360/feedback360Api.ts`)

```typescript
// Draft save (autosave from the submission modal)
saveFeedbackDraft: builder.mutation<void, FeedbackDraftRequest>({
  query: (body) => ({ url: '/feedback/draft', method: 'PUT', body }),
  invalidatesTags: ['Feedback360Request'],
}),

// Get the in-progress draft for a request (for resume)
getFeedbackDraft: builder.query<FeedbackDraftRequest | null, number>({
  query: (requestId) => `/feedback/draft/${requestId}`,
  transformResponse: (res: ApiResponse<FeedbackDraftRequest | null>) => res.data,
}),

// Cancel a request (HR/admin only)
cancelFeedbackRequest: builder.mutation<void, number>({
  query: (requestId) => ({ url: `/feedback/request/${requestId}/cancel`, method: 'POST' }),
  invalidatesTags: ['Feedback360Request'],
}),

// Reassign a request to a different evaluator (HR/admin only)
reassignFeedbackRequest: builder.mutation<void, { requestId: number; newEvaluatorId: number }>({
  query: ({ requestId, newEvaluatorId }) => ({
    url: `/feedback/request/${requestId}/reassign`,
    method: 'POST',
    body: { newEvaluatorId },
  }),
  invalidatesTags: ['Feedback360Request'],
}),

// Manager review: post calibration summary + adjusted score
postManagerSummary: builder.mutation<void, { summaryId: number; managerSummary: string; calibratedFinalScore?: number }>({
  query: ({ summaryId, ...body }) => ({
    url: `/360-feedback/summary/${summaryId}/manager-review`,
    method: 'PUT',
    body,
  }),
  invalidatesTags: ['Feedback360Summary'],
}),

// Scoring policies CRUD (HR/admin)
getScoringPolicies: builder.query<ScoringPolicy[], number>({
  query: (cycleId) => `/scoring-policy?cycleId=${cycleId}`,
  transformResponse: (res: ApiResponse<ScoringPolicy[]>) => res.data,
  providesTags: ['ScoringPolicy'],
}),
upsertScoringPolicy: builder.mutation<ScoringPolicy, Partial<ScoringPolicy> & { cycleId: number }>({
  query: (body) => ({ url: '/scoring-policy', method: 'PUT', body }),
  invalidatesTags: ['ScoringPolicy', 'Feedback360Summary'],
}),

// Competencies (HR/admin)
getCompetencies: builder.query<Competency[], void>({
  query: () => '/competency',
  transformResponse: (res: ApiResponse<Competency[]>) => res.data,
  providesTags: ['Competency'],
}),

// Nominations (Phase 4 — optional)
proposeNomination: builder.mutation<void, { targetUserId: number; nomineeId: number; relationship: FeedbackRelationship }>({
  query: (body) => ({ url: '/feedback/nomination', method: 'POST', body }),
  invalidatesTags: ['Nomination'],
}),
listMyNominations: builder.query<EvaluatorNomination[], void>({
  query: () => '/feedback/nomination/mine',
  transformResponse: (res: ApiResponse<EvaluatorNomination[]>) => res.data,
  providesTags: ['Nomination'],
}),
approveNomination: builder.mutation<void, number>({
  query: (id) => ({ url: `/feedback/nomination/${id}/approve`, method: 'POST' }),
  invalidatesTags: ['Nomination'],
}),
```

Add tag types `ScoringPolicy`, `Competency`, `Nomination` to `services/api.ts` `tagTypes` array.

---

## 3. Page-by-Page Changes

### 3.1 `Feedback360PendingPage.tsx` (evaluator workspace)

**Status badges** — already supports the four `FeedbackStatus` values via `STATUS_CONFIG`. No change.

**New: draft resume.**
- On row mount, if `status === 'IN_PROGRESS'`, button label changes from "Submit Feedback" → "Resume Draft".
- `SubmissionModal` calls `useGetFeedbackDraftQuery(request.id)` on open; pre-populates `answers` + `overallComment` from the response.
- Add a "Save Draft" button next to "Submit". On click, call `saveFeedbackDraft` and toast "Draft saved". Modal stays open.
- Autosave: debounce 5s after any input change → silent `saveFeedbackDraft` call. Show "Saved at HH:mm" indicator next to the modal title.

**New: due date + overdue indicator.**
- Show `dueDate` formatted with date-fns. If `isAfter(now, dueDate)` and `status !== 'COMPLETED'`, render an "Overdue" pill (red).
- Sort default: overdue first, then nearest due date, then submitted.

**New: cancelled state.**
- If `status === 'CANCELLED'`, disable the action button, show "Cancelled by HR" muted text.

**Validation surfacing.**
- Before submit, if `allRequiredAnswered()` returns false, scroll to first unanswered required question and show inline `AlertCircle` next to it.
- Map backend 400 validation errors onto specific questions when the response contains `questionId`.

### 3.2 `Feedback360ReportPage.tsx` (target's own report)

**Use new per-relationship breakdown.**
- `ScoreCard`s already read `managerScores/peerScores/subordinateScores/selfScores` — no change.
- For L04 targets (no manager), show `N/A` card and an info tooltip: "L04 employees have no upward manager — score weights distributed across peer and subordinate."
- For L07 targets (no subordinates), same treatment on the subordinate card.

**New: Self-vs-Others Gap chart.**
- Add a fourth tab (after Radar / Bar / Comments): **Gap Analysis**.
- Use Recharts `BarChart` with two bars per category — `selfScore` and `othersScore` — from `summary.selfVsOthersGap`.
- Highlight rows where `Math.abs(gap) >= 1.0` in amber: these are the actionable blind-spots / over-modesty signals.

**New: Participation stats banner.**
- Read `summary.participation`. Render a small horizontal stat strip above the score cards:
  - "Manager 1/1 · Peers 4/5 · Subordinates 3/3 · Self 1/1"
  - If any group has `suppressed: true`, show muted "(comments hidden — fewer than minimum required)" under that count.

**New: Calibration display.**
- If `calibratedFinalScore` is set, show it as the primary score with a small chip "Calibrated by manager" and the raw `finalScore` below as "Pre-calibration: X.XX".
- If `managerSummary` is non-empty, render it in a new "Manager Summary" panel above Comments.

**Anonymity hardening.**
- `DetailedComment.evaluatorName` already returns "Anonymous" from backend — don't decorate it client-side. Remove any client logic that infers identity from `evaluatorRole`.
- Render comments in the order returned by backend (already shuffled there). Do not re-sort by relationship or score.

### 3.3 `Feedback360AdminPage.tsx` (HR/admin)

**New panel: Scoring Policy editor.**
- Section above the generation form: "Scoring Policy for this Cycle".
- Table: rows = JobLevel (plus a "Default" row), columns = manager / peer / subordinate / self weights, includeSelfInFinal toggle, suppressionThreshold input.
- Each row's weights must sum to 1.0 ± 0.001 — show a red total if not. Disable save until valid.
- Save calls `upsertScoringPolicy`.

**New panel: Form-per-relationship assignment.**
- For the selected cycle, show four slots: Manager Form / Peer Form / Subordinate Form / Self Form.
- Each is a `<select>` of `AppraisalForm` rows where `formType === 'FEEDBACK'` and matches `targetRelationship` (or null).
- Block "Generate Requests" until all four slots are filled.

**Generation preview enhancements.**
- Existing preview table already shows `relationship`. Add columns:
  - **Due Date** (cycle.endDate by default; editable per-row inline).
  - **Form** (auto-resolved by relationship; read-only).
- Color-code rows where `isReciprocalFallback === true` (amber background).

**Request management actions.**
- Per-row inline actions on the requests table:
  - **Reassign** (opens employee picker → `reassignFeedbackRequest`).
  - **Cancel** (confirmation modal → `cancelFeedbackRequest`).
  - **Regenerate for this target** (existing flow).
- Disable Reassign/Cancel when `status === 'COMPLETED'`.

**Summary list — manager review.**
- For each summary row, add "Calibrate" button (HR/manager only).
- Opens modal with: raw `finalScore` (read-only), `calibratedFinalScore` input, `managerSummary` textarea.
- Save calls `postManagerSummary`. After save, button label → "Edit Calibration".
- "Finalize" stays as today — but now disabled until either calibration exists OR HR explicitly chooses "Finalize without calibration".

**Cycle freeze indicator.**
- If all summaries in cycle are `isFinalized: true`, render a "Cycle Locked" banner. Disable generation/reassignment/cancel actions.

---

## 4. New Pages

### 4.1 `Feedback360CompetencyPage.tsx` (HR/admin)
Simple CRUD page for the `Competency` entity. Used when tagging questions. Route: `/360-feedback/admin/competencies`.

### 4.2 `Feedback360NominationsPage.tsx` (Phase 4, optional)
Two-tab page:
- **My Nominations** — employee proposes peers/subordinates.
- **Pending Approval** — manager view of nominees to approve/reject/swap.
Route: `/360-feedback/nominations`.

### 4.3 Integration with existing pages
- Add a "My Received Feedback" tab to `Feedback360ReportPage` for managers viewing their direct reports' summaries (already supported by `useGetFeedbackSummaryQuery`, just gated by role).

---

## 5. Routing (`routes/feedback360Routes.tsx`)

```tsx
export const feedback360Routes = [
  { path: '/360-feedback/pending',            element: <Feedback360PendingPage />,     adminOnly: false },
  { path: '/360-feedback/my-report',          element: <Feedback360ReportPage />,      adminOnly: false },
  { path: '/360-feedback/team-reports/:empId', element: <Feedback360ReportPage />,     adminOnly: false }, // manager view
  { path: '/360-feedback/admin',              element: <Feedback360AdminPage />,       adminOnly: true  },
  { path: '/360-feedback/admin/competencies', element: <Feedback360CompetencyPage />,  adminOnly: true  },
  { path: '/360-feedback/nominations',        element: <Feedback360NominationsPage />, adminOnly: false }, // Phase 4
];
```

`Feedback360ReportPage` reads `:empId` from `useParams()` (fallback to `useAuth().user.id` for `/my-report`). Access check: viewer must be the target, the target's direct manager, or have HR role — surface a 403 page otherwise (defense in depth; backend `FeedbackAccessGuard` is the real enforcement).

---

## 6. Shared Components to Add

Under `components/feedback360/`:

- `RelBadge.tsx` — extract the existing inline `RelBadge` from `PendingPage` so it's reused across pages.
- `StatusBadge.tsx` — same extraction.
- `StarRating.tsx` — extract `StarRating`, add keyboard support (Left/Right arrows to change, Space/Enter to commit).
- `AnonymousChip.tsx` — small lock icon + "Anonymous" label, used in comment lists.
- `ParticipationStrip.tsx` — the "Manager 1/1 · Peers 4/5 ..." strip used in ReportPage.
- `GapBar.tsx` — single category gap visualization used by Gap tab.
- `SuppressionNotice.tsx` — muted info row used when a group is below threshold.

---

## 7. Validation & UX Rules

- **Star ratings** must always be 1–5. Disable submit when any required question lacks a score.
- **Draft autosave** uses a debounced `useEffect` (5s) — but always saves immediately on modal close if there are unsaved changes (don't drop draft data).
- **Anonymous indicator** — every PEER/SUBORDINATE comment renders with `AnonymousChip`. Manager and Self comments show the real name.
- **Reciprocal fallback** rows in admin preview get a tooltip explaining: "No rotated evaluator available — using last cycle's evaluator as fallback".
- **Cycle freeze** — when locked, all action buttons render disabled with a tooltip "Cycle is finalized".
- **Toast feedback** for every mutation: success ("Feedback submitted"), error ("Submission failed: <backend message>").

---

## 8. State / Caching Notes

- The `transformResponse` helper in `feedback360Api.ts` (`response?.data ?? response`) is inconsistent — some endpoints use it, others use the typed `ApiResponse<T>` form. **Standardize on `ApiResponse<T>` everywhere** to fix the inconsistency identified during review, and remove the loose helper.
- After `submitFeedback` succeeds, invalidate both `Feedback360Request` (so the pending list updates) and `Feedback360Summary` (so the target's report rebuilds). Already done — keep it.
- After `saveFeedbackDraft`, only invalidate `Feedback360Request` for the current evaluator (status flips to IN_PROGRESS). Don't bust the summary cache for the target.
- After `upsertScoringPolicy`, invalidate `Feedback360Summary` for the cycle — backend should recompute summaries (or surface a "Recalculate" button).

---

## 9. Rollout Order

### Phase 1 — Track backend Phase 1 (correctness)

1. Type updates: `selfVsOthersGap`, `participation`, `managerSummary`, `calibratedFinalScore` on `FeedbackSummaryResponse`; `dueDate`/`startedAt`/`isOverdue` on `FeedbackRequestResponse`.
2. `Feedback360ReportPage`: show N/A cards gracefully for missing relationships (don't render zero); render participation strip; remove any client-side anonymity logic.
3. `Feedback360PendingPage`: due date display + overdue badge; cancelled state rendering.
4. Standardize `transformResponse` to `ApiResponse<T>` everywhere.
5. `services/api.ts`: add `ScoringPolicy`, `Competency`, `Nomination` to `tagTypes`.

**Visible value:** target's report no longer mis-attributes a zero score for missing groups; pending list shows urgency.

### Phase 2 — Form per relationship + draft saves

6. RTK Query: `saveFeedbackDraft`, `getFeedbackDraft`, `cancelFeedbackRequest`, `reassignFeedbackRequest`.
7. `SubmissionModal`: resume from draft, autosave, "Save Draft" button.
8. `Feedback360AdminPage`: form-per-relationship slots; block generation until all four set.
9. Admin: row-level Reassign / Cancel actions.

### Phase 3 — Scoring policy + calibration + extras

10. `Feedback360CompetencyPage` (CRUD).
11. Admin: Scoring Policy editor table.
12. Admin: Calibrate modal + manager summary.
13. Report: Gap Analysis tab; Manager Summary panel; calibrated score display.
14. Manager view route `/360-feedback/team-reports/:empId`.
15. Cycle freeze indicators.

### Phase 4 — Nominations (optional)

16. `Feedback360NominationsPage` (My Nominations + Pending Approval tabs).
17. Wire RTK Query endpoints for `proposeNomination` / `approveNomination`.

---

## 10. Files Touched (summary)

**Modified:**
- `features/feedback360/feedback360Types.ts` — new fields on existing types
- `features/feedback360/feedback360Api.ts` — new endpoints, standardized `transformResponse`
- `services/api.ts` — new tag types
- `pages/feedback360/Feedback360PendingPage.tsx` — drafts, due date, overdue, cancelled
- `pages/feedback360/Feedback360ReportPage.tsx` — gap tab, participation, calibration, manager view
- `pages/feedback360/Feedback360AdminPage.tsx` — scoring policy editor, form-per-relationship, calibrate, reassign/cancel
- `routes/feedback360Routes.tsx` — new routes

**New:**
- `components/feedback360/RelBadge.tsx`
- `components/feedback360/StatusBadge.tsx`
- `components/feedback360/StarRating.tsx`
- `components/feedback360/AnonymousChip.tsx`
- `components/feedback360/ParticipationStrip.tsx`
- `components/feedback360/GapBar.tsx`
- `components/feedback360/SuppressionNotice.tsx`
- `pages/feedback360/Feedback360CompetencyPage.tsx`
- `pages/feedback360/Feedback360NominationsPage.tsx` (Phase 4)
- `features/feedback360/scoringPolicyApi.ts` (or fold into `feedback360Api.ts`)

---

## 11. Test Plan

**Phase 1 component tests (Vitest + React Testing Library):**

- `Feedback360ReportPage` renders "N/A" for `managerScores: []` (L04 case) without throwing.
- `Feedback360ReportPage` renders participation strip with correct ratios.
- `Feedback360PendingPage` shows "Overdue" badge when `dueDate < now` and `status === 'PENDING'`.
- `Feedback360PendingPage` disables submit for `status === 'CANCELLED'`.

**Phase 2 tests:**

- Submission modal opens, autosaves after 5s of inactivity, button shows "Saving..." → "Saved at HH:mm".
- Resume flow: open modal with draft → answers pre-populated.
- Admin: scoring policy weights summing to 0.95 → save disabled with red total.
- Admin: cannot generate when any form slot is empty → button disabled with tooltip.

**Phase 3 tests:**

- Gap tab highlights rows with `|gap| >= 1.0`.
- Calibrated score, when present, takes visual precedence; raw shown below.
- Manager view route enforces role check (renders 403 when viewer is neither target nor manager nor HR).

**E2E (Playwright, optional):**

- Full evaluator flow: receive notification → open pending page → fill form → save draft → reload → resume → submit → see status COMPLETED.
- Full admin flow: configure scoring policy → upload forms → generate preview → adjust → generate → calibrate one summary → finalize.

---

## 12. Risks & Notes

- **Recharts radar with all-null categories** crashes — guard `RadarChart` rendering with `if (radarData.every(r => r.Manager == null && ...))` and show empty-state instead.
- **Star rating keyboard support** is a small thing but commonly missed — add it during the shared-component extraction.
- The existing `transformResponse: (response: any) => response?.data ?? response` helper masks API contract drift — replacing it with strict `ApiResponse<T>` may surface inconsistent backend responses. Coordinate with backend changes.
- `useGetFormQuestionsQuery` runs on every modal open — for cycles with hundreds of pending requests for a single evaluator, consider prefetching form metadata once at page mount and caching by `formId`.
- Draft autosave should not fire when the modal is freshly opened with prefilled data (avoid empty `PUT` overwriting the just-loaded draft); guard with a "dirty since load" flag.
