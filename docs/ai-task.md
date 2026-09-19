# AI Task Manager

## Routes and authentication

- `/demo/ai-task`: main chat, editable confirmation forms, task disambiguation and persisted history.
- `/demo/ai-task/tasks`: expandable task tree, search, filters, manual creation/editing, subtree moves, trash and restore.
- `/demo/ai-task/dashboard`: summary and dynamic group management.
- `/demo/ai-task/api`: authenticated GET resources and POST operations.

Uses the existing `AuthProvider`, `AuthMenu`/`LoginModal`, `requireAuth`, `fetchWithAuthRetry` and cross-site mutation guard. The login modal stays on the module route; client refresh handles expired access tokens, so `/auth/continue` does not need to change. Every API request verifies the current server session. The server derives the owner from `auth.user.id`; clients cannot choose an owner. `activeGame` is unrelated to task access.

## Firestore

Uses the existing Firebase Admin connection, with all module records under:

```text
demo/ai-task/users/{authenticatedUserId}
  taskGroups/{groupId}
  tasks/{taskId}
  chatSessions/main
    messages/{messageId}
```

The user root holds an initialization flag, revision and `treeSchemaVersion`; the chat session holds sequence and pending-message ID. Initialization is an authenticated, idempotent POST that creates Inbox, Ainka, Cá nhân and Ý tưởng as data. It does not seed tasks or modify Aqua. Collections are created lazily on first use; no live database was seeded during implementation. No composite Firestore index is required.

On opening the module, existing records are migrated per authenticated owner in one transaction: `parentTaskId` becomes `parentId`, and `rootTaskId`/`depth` are calculated from actual links. The old field is removed. Status, timestamps, content and versions are preserved, so old pending confirmations remain valid; history/proposals are adapted on read. The root receives `treeSchemaVersion: 2`. Repeated initialization does not repeat the migration. A pre-existing dangling reference or cycle aborts the migration without silently moving or dropping data. No other user's records are visited.

Task schema (Firestore timestamps are serialized as ISO strings in API responses):

```ts
Task {
  id: string // document ID, mapped in responses
  title: string
  description: string | null
  groupId: string
  priority: 'urgent' | 'normal' | 'low'
  status: 'todo' | 'in_progress' | 'waiting' | 'blocked' | 'done' | 'cancelled'
  parentId: string | null
  rootTaskId: string // self for a root; parent's rootTaskId for a child
  depth: number // 0 for a root; parent's depth + 1 for a child
  deadline: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
  cancelledAt: Timestamp | null
  deletedAt: Timestamp | null
  version: number // optimistic concurrency check
}
```

There is no `source`, category enum, separate subtask collection or duplicated user identity in tasks. All write times use `FieldValue.serverTimestamp()`. AI/user deadline ISO strings are validated and converted to `Timestamp`. All status transitions maintain/reset completion and cancellation timestamps consistently, including manual edits.

Groups contain name, slug, color, order, isDefault, isActive and server timestamps. Name changes retain group IDs. Hiding a group leaves its tasks intact and visible; new assignments require an active group. Inbox cannot be hidden. Re-enabling a group is supported. Group creation/editing happens only in the dashboard, with an explicit Save action.

## Chat and confirmation

### Secretary conversation and task memory

Assistant replies use short Vietnamese action-specific wording from `_lib/assistant-replies.ts`. Pending cards use future/confirmation language; only a successful transaction stores a completion reply with the final edited title. Delete and cancel retain their distinct meanings. Query replies state actual counts above task cards. Internal memory/source details never appear in assistant prose; AI free-form replies are instructed and guarded accordingly.

The parser extracts only fields explicitly mentioned in the current message. It receives the draft mode/title for classifying follow-up messages, but no overview values to copy into AI output. Dynamic group names, slugs and IDs are resolved against the authenticated owner's active TaskGroups; parent queries are resolved against that owner's tasks. Authentication continues through requireAuth().

Overview is stored as overviewMemory on demo/ai-task/users/{uid}. It contains only groupId, parentId, priority, status, startNow, startClock and a server updatedAt timestamp. Only successful confirmed create/edit forms update it, atomically with the task and existing confirmation receipt. Title, description/notes, duration, deadline and absolute start dates are never overview defaults. Existing workMemory.lastForm is read through an allowlist for compatibility; preferences, habits and historical messages are not read. The next confirmed save removes the legacy workMemory field.

Conversation memory lives only in sessionStorage under ai-task-chat-context:{userId}, scoped to the tab and authenticated user. It contains mode, activeDraft, conversationDefaults and updatedAt. Refresh preserves it; tab closure ends the session, and two hours without activity expires it. Storage failures fall back to in-memory state. Form edits and chat follow-ups update the same local draft. A fresh creation clears task-specific fields while preserving group/parent/priority/status as conversation defaults. Confirm clears the active draft and retains only those reusable defaults; cancel clears the active draft without teaching overview. The reset button clears session context only.

The pure resolver in _lib/task-memory.ts uses explicit input > activeDraft > conversationDefaults > overview > system default, with a field allowlist and runtime source metadata. Explicit null clears nullable fields. Hidden groups fall back to an active default group; missing, foreign, deleted, completed/cancelled or cross-group parents are cleared in preview and rejected if submitted at confirmation. Parent pickers filter by the selected group. Duration-derived deadlines are recalculated after start/duration changes; explicit deadlines switch scheduling mode. “Start now” is finalized only at confirmation.

TanStack Query caches overview with key [ai-task, memory, userId], staleTime/gcTime Infinity. Loading overview costs one document read, ordinary chat has zero Firestore memory reads/writes, and confirmation returns the new overview for setQueryData without refetch. Existing chat history, proposal receipts, group/task validation and revision tracking still have their own reads/writes; the memory budget is not a claim that all chat/database operations are free. Follow-up chat atomically supersedes the previous pending preview, preventing an older form from being confirmed.

The memory panel displays readable labels and resolved group/task names, not raw JSON. Tests cover source precedence, explicit clears, forbidden inheritance, session TTL, parent validation, incremental drafting, atomic failure/retry and memory IO counts. Browser fixtures cover chat amendments, edited draft restoration after refresh, cache updates after confirmation, and the next task not inheriting duration/notes/deadline. Live LLM phrasing and production Firestore still require acceptance testing.

The parser has no database imports or mutation capability. It returns a validated structured intent. Backend services resolve dynamic groups and task names, then persist a proposal. Unknown groups suggest Inbox visibly; unknown read-filter groups return a clear message rather than silently reading Inbox. Multiple matching tasks require user selection; more than 30 matches require a narrower query. The backend decides which actions need confirmation, not an AI-provided flag.

Chat mutations use a compact confirmation form: title, group/parent, start, and selected duration/deadline. Priority/status are clickable text that opens a select. “Mở rộng” reveals all fields without losing edits; validation errors also expand the form. The Tasks tab displays the full form and saves create/update/subtask actions directly with “Xác nhận lưu”, remaining on the same page. Delete/restore retain chat confirmation.

Direct saves and chat confirmations share the same transaction for field, ownership, version, group, parent and subtree validation, timestamps, and memory learning. Direct-save receipts at `taskSaves/{requestId}` prevent duplicate writes and do not consume pending chat proposals. Editable fields are validated again when confirmed. Delete/restore use the original proposal instead of accepting edits in the confirmation payload. Transactions update a per-user revision to serialize related parent/group changes. Repeated confirms return the saved result without another mutation. Repeated chat/proposal request IDs return the original turn. A stale form must be reopened with the current task version.

`CREATE_SUBTASK` resolves the proposed parent name at any depth. The parser has examples for “Thêm môn Toán cho Bạn A”, “Thêm Bạn C vào Dạy thêm”, and “Thêm việc đo áo dưới Út Nhung”. These all create ordinary tasks; there are no student/subject/customer collections. AI cannot submit `parentId`, `rootTaskId` or `depth`. Ambiguous parent names show ancestor paths in the choice cards, then require confirmation.

One pending proposal per personal chat is supported. Cancel only changes the proposal status, never the task. Read actions show actual service results without confirmation. History is loaded 40 messages at a time; earlier history is available through “Xem tin nhắn trước”. MVP uses one persistent personal chat session (`main`), without a session switcher or clear-history action.

Voice reuses `src/hooks/useVoice.ts` and `VoiceInputSlot`. Speech only fills the composer; the user must press Send. Unsupported browsers can always type. Chat message presentation is shared with Aqua through `ChatMessage`; task UI imports Aqua styles and adds only `.ai-task-*` scoped layout rules.

## Dates, search and subtasks

- Tasks support optional `startTime` (ISO/Timestamp) and `duration` (positive integer minutes). The duration picker has Day (1–4), Hour (1–24), and Minute (1–60) tabs; new manual tasks default to “Ngay bây giờ” and 1 day. The form offers duration/deadline modes and a change-start control. startNow remains unresolved throughout proposals; the server fixes startTime at confirmation and clears the flag. Deadline mode preserves the entered deadline and calculates duration rounded up to whole minutes; expired deadlines are rejected when confirming. Saved tasks retain their fixed start on later edits. Switching tabs alone preserves the saved duration, including legacy custom values. Whenever both fields are present, the form previews and server recalculates deadline as start + duration, including across midnight. Clearing duration allows manual deadlines. The old withinDay flag is accepted for compatibility but no longer controls scheduling.
- Timezone is `Asia/Ho_Chi_Minh` (+07:00), independent of browser timezone. Confirmation shows a concrete editable datetime.
- The parser is instructed to suggest 17:00 for a date without time, 09:00 for morning, 15:00 for afternoon, and Sunday 17:00 for “cuối tuần”. These are suggestions requiring confirmation, not scheduled reminders.
- Today is the current local calendar day. Upcoming starts tomorrow. Overdue compares the actual instant and excludes done/cancelled/deleted tasks. Default views exclude soft-deleted tasks; Trash explicitly includes them.
- Search normalizes Vietnamese accents, case and `đ`, across title/description. Task target selection searches title and never picks arbitrarily among duplicates.
- Personal-size search/summary scans tasks in database pages of 300, then filters/ranks on the server. Flat chat results still return 30 matches per page. The tree endpoint returns matching tasks plus all ancestors, without flat pagination that would split branches. Non-matching ancestors are labelled as context; filtered-out sibling branches are not shown. Collapse/expand, open all and collapse all operate on this tree, with indentation based on persisted depth. **Read cost scales with total tasks**; large datasets will need indexed query plans or a dedicated search index. Chat receives only matching results and active group names, not the full database.
- Recommendations use deterministic rules: overdue, urgent, nearest deadline, in-progress. The UI renders those real tasks directly; no extra AI summary call is needed.
- Tasks can nest without a fixed depth limit. Tree traversal and validation are iterative rather than recursive. Every level has independent status/priority/deadline; completing a parent does not complete descendants.
- Parent selectors in both manual forms and chat confirmations show full paths and exclude self, the entire descendant branch and deleted branches. Backend revalidates the current database in the confirmation transaction; stale/forged choices cannot bypass validation. Choose “Không có · Task gốc” to move an existing branch to the root level. `CREATE_SUBTASK` requires a parent.
- A move changes `parentId` on the moved task and recomputes `rootTaskId`/`depth` for **all descendants, including soft-deleted descendants**, in the same transaction. Descendant versions and update timestamps advance; their content, groups, status and deadlines remain unchanged. Self-parenting and moving into a descendant are rejected before writes. `rootTaskId`/`depth` are server-derived fields, never accepted from clients.
- Deleting a node with any non-deleted descendant is blocked. Delete from leaves upward or move child branches first. Soft-deleted documents retain their links; restore from ancestors downward. Active tasks cannot be created, moved or restored under a deleted ancestor. All structural changes are atomic; if database transaction size/time limits are reached, the operation fails without a partially moved branch. There is no application-level maximum depth.

## Configuration

Reuses `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, existing auth configuration and `CHAT_PROVIDER` with its corresponding API key/model variables, following Aqua's provider configuration. No new secret names or dependencies. With no AI key or invalid AI output, the user gets an error and can continue through the manual task form.

## Changed/new files

New application files are contained in `src/app/demo/ai-task/`: route pages/layout/error/style, `_lib/{model,tree}.ts`, `_services/{repository,task.service,ai-task-parser}.ts`, `api/route.ts`, and `_components/{Shell,Provider,Chat,TaskForm,TaskCard,Tasks,Dashboard}.tsx`.

Shared changes: `src/components/chat/ChatMessage.tsx` (new), Aqua `Chat.tsx` consumes that presentation, `SiteShell.tsx` recognizes AI Task as a standalone module, and `package.json` adds test commands. Auth behavior, Aqua data/services and game engines are unchanged.

Test support: `scripts/test-ai-task.cjs`, `scripts/test-ai-task-browser.cjs`, `scripts/lib/ai-task-test-harness.cjs`. The harness replaces database/auth/AI only inside a separate test process; production source contains no test bypass.

## Validation and manual acceptance

Run `npm run typecheck`, `npm run test:ai-task`, and `node src/app/demo/aqua/_tests/business.test.cjs`. Run lint on the changed module/shared components with the Next CLI. Service/API tests execute the real TypeScript against a transactional memory adapter enforcing namespace and reads-before-writes. The 23 cases cover ownership, guest/CSRF rejection, validation, idempotency, stale proposals, dynamic groups, timestamps, multi-level tasks, subtree moves including deleted descendants, cycle prevention, parent choices, migration of legacy tasks/proposals, soft-delete, exhaustive search and timezone boundaries. Pure tree algorithms are also tested with 12,000 levels; that is an algorithm test, not a 12,000-document live Firestore transaction.

Browser test prerequisites: Next dev on port 3252 and a dedicated headless Chrome with remote debugging on port 9352. Run `npm run test:ai-task:browser`. It opens actual Next routes with actual styles/components, uses the existing login modal, intercepts auth/LLM and routes API requests to the real services with isolated memory storage. No live credentials or database writes. It tests desktop/mobile, voice transcript requiring Send, editable confirmation, cancel, ambiguous task selection, groups, delete/restore, all three subtask examples, multi-level creation, collapse/expand, parent exclusions, moving an entire subtree and search retaining ancestors. Screenshots go to `node_modules/.cache/ai-task-browser/`.

Manual checks against a configured deployment:

1. Open `/demo/ai-task` while logged out; sign in through the existing modal. Open a second account and verify task/history isolation, then check logout, expired-token refresh and inactive-account rejection.
2. Say “Tạo task Ainka code EDA cho MSD, gấp, mai xong”; verify transcript first, press Send, check date/time/group, change a field and Confirm. Reload and verify persistence.
3. Create two EDA tasks, send “EDA xong rồi”, choose one and Confirm. Verify the other is unchanged. Cancel another proposal and verify no task change.
4. Edit status through done/cancelled/back to todo; test overdue, no deadline, today, upcoming, accents and search. Try double-confirm and a stale form from another tab.
5. Build `Dạy thêm → Bạn A → Toán → Phân số` and `May đồ → Út Nhung`. Collapse/expand each level and search for “Phân số”; its ancestors should remain as context. Use the three chat examples above. Add another child directly from a third-level task.
6. Edit Bạn A, verify that Bạn A/Toán/Phân số cannot be chosen as its parent, then move it under Út Nhung. Before Confirm the original tree must remain. Afterwards every descendant must have May đồ as root and updated depths. Move the branch back to root level, and try a forged self/descendant parent via API. Try deleting a node before its descendants; delete from leaves upward and restore from ancestors downward.
7. Add a group, use it through chat, rename and hide it; verify task names/relations remain and Inbox cannot be hidden.
8. Test microphone permission denial/unsupported browser and real Vietnamese speech recognition. Test actual AI provider interpretation and failure handling. Confirm Aqua still looks/behaves the same.

Actual microphone recognition/audio quality, real AI provider responses, deployed Firestore and real account sessions require live acceptance testing. The automated browser test substitutes those external boundaries. This implementation does not include calendar/reminders, recurring tasks, team features, attachments, advanced analytics, bulk changes, multi-action chat commands or multi-session UI.

### Grouped task results

Chat list queries and dashboard counts display leaf tasks only. Existing filters and ranking run before the presentation transform; leaf detection uses the complete task lookup (including children outside the filter, completed or deleted children), and pagination follows leaf selection. Task parents remain headers even when they have deadlines. `_lib/task-display.ts` builds ID-based group/ancestor paths with iterative lookups and cycle protection. `_components/TaskResultGroups.tsx` renders compact rows with one shared heading. Ancestor/group display data is attached only to read responses, never persisted. Explicit task details and candidate selection retain their cards; the `/tasks` management tree, task writes, authentication and memory flows are unchanged.
