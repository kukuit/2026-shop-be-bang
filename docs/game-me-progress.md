# User progress architecture

## Lazy subject cards on `/game/me`

The overview renders three static subject cards initially. No progress, goal, or
session request runs until the parent clicks **Xem** on a card. **Xem tiến trình**
and **Xem lịch sử** remain separate links with prefetch disabled.

`resource=overview&grade=1&subject=toan` reuses `getSubjectProgress` reconciliation
and returns up to three goals with the lowest accuracy, including scores at or
above 80%. Unplayed goals are excluded. No data means no practice section; the
overview never displays “Đang học tốt”.
`weakGoals` is response-only, not a persisted Firestore field. Goal IDs and lesson
IDs come from the existing catalog; titles, lesson numbers and lesson links are
resolved from `getSubjectLessons` locally. Overview and lesson details share
`currentGoalAccuracy`: use the latest 20 answers when at least 5 recent answers
exist; otherwise use lifetime correct / (correct + wrong). No answers means null.
Both read the same newest 50 sessions **per owned lesson**, with the same timestamp
and document-ID ordering and reversed result order inside each session. This
replaces the older account-wide 50-session window, keeping other subjects out of
the query. Overview fetches history only for published lessons with aggregate
answer data, after Xem. The summary omits calculation explanations for readability.
Accuracy on the card uses correct / (correct + wrong); missing answers show `--`.
Completion still uses the existing unique game requirements. The card no longer
shows a subject-wide game total. `getOverviewLesson` selects the first started but
incomplete lesson in curriculum order, otherwise reuses `currentLessonId`. Started
means existing attempts, completed game types, or last-played timestamp. Only that
lesson shows `completedGames / totalGames`; replays never add game types. Unknown
legacy completion is labelled as unknown, not zero. Lesson links use static `href`,
not a game route. Unpublished lessons show “Sắp có” without a launch link. Empty
curriculum and completed curriculum have separate states. A subject with no study
history shows “Bài bắt đầu”; no goal-data means no practice section. None of these
presentation changes add queries or change detailed subject pages.

Cold Toán grade 1 costs 1 subject document + 2 published lesson aggregates = 3
document reads, plus 0–8 existing completion existence queries if legacy games
lack completion evidence. Each query is owner/lesson/game scoped and limited to 1
document; empty queries can still bill a minimum read. Thus the expected budget is
3–11 aggregate/completion reads, plus up to 50 session documents per played lesson
for recent accuracy (up to 100 for the two published Toán lessons). Empty queries
can bill a minimum read. No other subject or full history is read. Initial entry
still costs zero progress reads; cache/collapse behavior is unchanged.

Before rollout, create the composite index specified in `firestore.indexes.json`:
collection `sessions`, collection query scope, `lessonId ASC`, `completedAt DESC`
(document ID follows the descending final sort). This file is a required index
definition, not a deployment of the index; retain any other production indexes.

TanStack key: `[game, me, subject-overview, uid, grade, subjectId, v3]`. The response
version avoids reusing old single-goal or below-80-only cached responses.
Missing `weakGoals` never counts as evidence of no weak goals; a legacy
`weakestGoal` can still be rendered during a rolling update. The query is
disabled until that card is requested, with 5-minute freshness and 30-minute GC.
Collapse/expand retains the mounted query and does not refetch, even after becoming
stale. Returning to the overview still requires clicking Xem; fresh cached data
is reused. Focus/reconnect do not refetch. Save events invalidate only the matching
subject cache; account/grade changes reset the card selection. Existing subject
routes and their query behavior are unchanged.

This section supersedes the older description of the overview as navigation only.

## Current report behavior (September 2026)

The report now separates lifetime accuracy from current goal assessment. Goal
details read at most 50 most recent sessions of the authenticated account, ordered
by completion timestamp and document ID. Within that bounded history, answers are
ordered newest first per goal (including reverse result order inside each session).
The latest 20 answers determine the current status; the preceding 20 form the
comparison window. Status requires 5 answers, and a percentage-point trend requires
5 answers in both windows. Older errors remain in lifetime totals but do not lower
the current rating. A goal absent from these 50 sessions has no recent assessment;
the UI explicitly describes this limit rather than falling back to a lifetime rating.

Subject reads reconcile each published lesson against its legacy aggregate, even
when a partial subject summary already exists. Missing completed game types are
checked with owner-scoped lesson/game equality queries, each limited to one session
and projecting only `completedAt`. Replays count once per game type. Historical
attempts with no completion evidence show unknown completion rather than a false
`0/4`. These reads do not migrate or write data. The explicit backfill remains useful
for materializing summaries, but a missing subject document no longer hides existing
lesson counters. Session-only history without a lesson aggregate still needs backfill.

These changes supersede the older read-budget and empty-subject behavior below:

- Subject: one subject document plus one aggregate per published lesson; up to one
  existence query per missing game type when the lesson has answer history.
- Expanded goals: one aggregate plus up to 50 projected session documents. This
  applies per cold goal query; the existing 5-minute client cache still avoids reads
  when closing and reopening the same lesson.
- Overview and session pagination behavior are unchanged.

Completion remains participation across different game types, not a skill rating.
The UI labels it accordingly and presents lifetime accuracy as reference only.

`/game/me` is a navigation screen. It does not call a progress service or load sessions. Auth and the existing game profile provider are unchanged.

## Routes and UI

- `/game/me`: cards for Toán, Tiếng Việt, Tiếng Anh, and session history.
- `/game/me/toan`, `/game/me/tieng-viet`, `/game/me/tieng-anh`: one shared `SubjectProgressView`. Grade comes from the existing game profile (`activeGrade ?? primaryGrade ?? 1`).
- `/game/me/session`: cursor-paginated history, 20 rows at a time. Attempt details load separately on expansion.
- `/game/me/tracking`, `/game/me/evaluation`, `/game/me/dashboard`: redirect to `/game/me`. The former dashboard's unused components/data remain for compatibility; they are not mounted by any of these routes.

Static lesson metadata and game requirements come from the existing lesson map and tracked lesson catalog. Grade 1 currently defines 41 Toán lessons, 10 Tiếng Việt lessons, and 16 English units. Only the published lessons have games. Other grades do not inherit grade 1 metadata or progress; they show an empty curriculum until their definitions exist.

Completion and accuracy are separate. Completion uses the existing `requiredGames`: currently 2 unique completed games for the published math/English lessons and 4 for Vietnamese lesson 1. `isLessonCompleted` is shared with the lesson map. Replaying a game adds attempts but does not add a unique completed game. The subject's current lesson is the first incomplete lesson in curriculum order, including a not-yet-published lesson. Unpublished rows cannot launch a game; no additional progression locking was introduced.

Accuracy is `attempts > 0 ? Math.round(correct / attempts * 100) : null`. Each recorded answer counts, including retries. Goal status is:

| Condition (checked in order) | Label |
| --- | --- |
| No attempts | Chưa học |
| Fewer than 5 attempts | Chưa đủ dữ liệu |
| Accuracy below 70 | Cần luyện thêm |
| Accuracy below 85 | Đang luyện |
| Accuracy below 100 | Đã nắm |
| Accuracy 100 | Xuất sắc |

## Firestore schema

New subject document:

```text
shopbebangcom/users/users/{uid}/subjectProgress/{subjectId}-{grade}
```

Fields: `schemaVersion: 1`, `userId`, `grade`, `subjectId`, `totalLessons`, `completedLessons`, `correct`, `wrong`, `attempts`, `accuracy`, `currentLessonId`, `lessons`, `updatedAt`.

Each `lessons[lessonId]` contains `completed`, `completedGames`, `totalGames`, `correct`, `wrong`, `attempts`, `accuracy`, `lastPlayedAt`, `completedAt`. Titles, goal definitions and game definitions are not copied. `updatedAt` is a Firestore server timestamp; per-lesson dates are ISO strings or null. Subject totals sum the stored per-lesson summaries (weighted by attempts, not averages of percentages).

Goal document is **reused**, not duplicated:

```text
shopbebangcom/game/learning_progress/{uid}_{lessonId}
```

Its existing `keys`, `games`, `totalSessions`, `updatedAt`, `userId`, `grade`, `subject`, and `lessonId` fields are retained. The read adapter presents `keys` as `goals`, adding each goal's label and computed accuracy from static definitions. This provides one goal-document read per expanded lesson without creating a second copy of the same aggregate.

Sessions keep their existing path and embedded results:

```text
shopbebangcom/game/user_sessions/{uid}/sessions/{sessionId}
```

## Write flow and consistency

`POST /api/game-tracking/sessions` keeps its validation, guest handling, auth handling and session schema.

Inside the existing transaction:

1. Read the session ID. If it exists, return without writes.
2. Read the existing lesson aggregate and the relevant subject document.
3. Increment existing goal counters exactly as before and update unique completed games.
4. Replace this lesson's subject summary using those updated cumulative goal counters. Recalculate subject totals/current lesson from the small stored summary map; no session query is used.
5. Create the session and save both aggregates in the same commit.

All transaction reads precede writes. Concurrent sessions for the same subject are serialized by Firestore's transaction conflict retry. A failed commit cannot leave the session saved without the aggregate. Retrying the same ID cannot double-count. Guest and disabled-game accounts keep the previous save behavior and do not get subject aggregates.

The response adds an optional `progressScope`. After a successful save, the repository retains its original `game-tracking:saved` event and emits `game-progress:saved` with that scope. `ProgressCacheSync` invalidates only that user's subject/grade and lesson queries, and removes their inactive session-list cache. It does not invalidate other subjects.

## Reads, lazy loading and cache

The authenticated GET endpoint is `/api/game/me?resource=...`. It calls `requireGameUser` and uses the authenticated ID for every path; client-supplied user IDs never select a database owner. Grade, subject, lesson membership, session ID and cursor are validated. All responses are private/no-store; caching is in TanStack Query.

| Interaction | Expected document reads on a cold cache |
| --- | --- |
| Open `/game/me` | 0 progress/session reads |
| Open one subject | 1 subject document |
| Leave all lessons collapsed | 0 goal documents |
| Expand one lesson | 1 existing lesson aggregate |
| Close/reopen within the 5-minute fresh period | 0 additional reads |
| Expand a different lesson | 1 more goal document |
| Open session history | Up to 20 session documents |
| Load more sessions | Next 20, using a timestamp + document-ID cursor |
| Expand a session detail | 1 session document |

These are application document reads; existing auth/profile checks and any Firestore index billing are separate. An empty query/missing document can still have a minimum billed read. An exactly full final page offers “Xem thêm”; that final empty request confirms the end, avoiding an extra look-ahead read on every page.

Session lists use `select(...)` to exclude embedded results from the returned payload. A projection reduces transferred data, not per-document read billing. Pagination uses the complete seconds/nanoseconds timestamp and document ID to avoid duplicates at tied timestamps; it does not read the cursor document again.

Query keys:

```text
[game, me, subject-progress, uid, grade, subjectId]
[game, me, lesson-goal-progress, uid, lessonId]
[game, me, sessions, uid]
[game, me, session-detail, uid, sessionId]
```

Stale time is 5 minutes, garbage collection 30 minutes, no window-focus refetch, no realtime listener and no automatic error retry. Queries for goals/details are disabled while collapsed. Session lists retain earlier pages on navigation and load only the next page on “Xem thêm”; “Làm mới” resets the list to page 1. Account changes clear the previous account's progress cache. Errors/loading are local to the relevant section/accordion; navigation stays usable.

## Backfill existing accounts

No production data is migrated automatically. Before rollout to existing accounts, run the explicit per-user backfill:

```powershell
node scripts/backfill-game-progress.cjs --user-id usr_EXAMPLE
node scripts/backfill-game-progress.cjs --user-id usr_EXAMPLE --apply
```

The first command is dry-run (read-only). The second applies the reported aggregates. The script uses the existing Firebase environment configuration and checks that the user exists. It scans that user's current session collection in pages of 500 only in this admin/dev workflow. It preserves existing cumulative goal keys as authoritative, fills missing unique-game evidence from sessions, reconstructs missing lesson aggregates from session results, and builds the subject documents using the same functions as live writes. Existing lesson aggregates are reread inside each subject transaction before writes, so live updates to these documents cause transaction retries rather than overwrite newer values.

It is repeatable and does not delete sessions, alter auth or rewrite existing goal counts by adding history a second time. Unknown/untracked lesson sessions are reported as skipped. Older session storage, if still present, must first be handled by the project's separate session-storage migration; this script never moves session paths.

Until backfill runs, an absent subject document is displayed as empty. New game saves populate the touched lesson (including that lesson's existing goal counters), but do not scan other historical lessons. Backfill is needed to populate the complete historical subject summary.

## Files and validation

- `src/lib/game-progress/`: shared config/model, paths, server reads, TanStack options and backfill.
- `src/components/game/me/`: navigation, subject view, lazy goals, session history, cache synchronization and local loading/error UI.
- `src/app/game/me/`: navigation overview, three thin subject routes, session route and legacy redirects.
- `src/app/api/game/me/route.ts`: authenticated read API.
- `src/app/api/game-tracking/sessions/route.ts`: atomic subject aggregate addition.
- `src/components/games/general/tracking/firestore-game-repository.ts`: scoped post-save cache event.
- `src/components/games/lesson-map/progress.ts`: shared completion predicate; map behavior retained.
- `src/app/providers.tsx`: mounts the cache event bridge.
- `scripts/backfill-game-progress.cjs`, `scripts/lib/load-project-ts.cjs`: explicit backfill command and script-only TS loader.
- `scripts/test-game-me-progress.cjs`, `scripts/lib/progress-firestore-mock.cjs`: isolated tests; never connect to Firestore.

Validation commands:

```powershell
npm run typecheck
node scripts/test-game-me-progress.cjs
node scripts/test-lesson-map.cjs
node scripts/test-lesson-journey.cjs
```

The new tests cover read scope/counts, pagination ties, lazy query cache, owner isolation, status boundaries, game completion, repeat/duplicate saves, atomic failure, guest behavior and dry-run/repeated backfill. No Phaser scenes, game UI, score rules, voice, auth implementation or game-profile schema were changed.
