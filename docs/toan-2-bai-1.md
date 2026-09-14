# Toán lớp 2 – Bài 1: Ôn tập các số đến 100

Route: `/game/lop-2/toan/bai-1`. Reuses BubbleMathScene, GoldMinerScene,
RacingScene and DragDropGame. Grade 2 mathematics lists ten lessons; lessons
2–10 remain coming soon. Existing Grade 1 navigation is unchanged.

## Learning goals

| Key | Games |
| --- | --- |
| RECOGNIZE_NUMBERS_100 | Reinforced through reading/composing; no standalone matching |
| READ_WRITE_NUMBERS_100 | Bắn bóng, Đào vàng, Kéo thả |
| TENS_ONES | Bắn bóng, Đua xe, Kéo thả |
| COMPOSE_NUMBER | All four |
| DECOMPOSE_NUMBER | Bắn bóng, Đua xe, Kéo thả |
| COMPARE_NUMBERS_100 | Bắn bóng, Đào vàng, Đua xe |
| ORDER_NUMBERS_100 | Bắn bóng, Đua xe, Kéo thả: minimum/maximum |
| NUMBER_CHART_100 | Reserved: createNumberChartBlock |
| ESTIMATE_AND_COUNT | Reserved: createEstimateAndCount |
| FORM_TWO_DIGIT_NUMBERS | Kéo thả: separate tens and ones targets |

Each question has one primary `goalKey`, mapped to existing `learningKey` /
`learningKeys` fields. `lessonId` is `toan-2-bai-1`. No tracking schema changes.

## Randomness and voice

Textbook alignment update: compose tens/ones, identify tens/ones, read/write
two-digit numbers, decompose with a missing tens or ones term, compare against
whole-ten boundaries (including strictly between two consecutive tens), select
minimum/maximum, and form a number using digit cards. Removed standalone number
matching, predecessor/successor and inequality sequences. Recognition remains
implicit; seven goals are directly tracked in playable questions and two are
reserved for future visual mechanics. No shared engine changes.

The parameterized banks contain 724 / 204 / 634 / 691 distinct task identities
for bubble / gold / racing / drag respectively. Each new load samples ten
questions without replacement and shuffles their order and answer options.
IDs describe type, input and variant, excluding option order and distractors.
The bank also randomizes conditional answers and distractors when created.
Different sessions may overlap. No previous fixed set is replayed.

Conditional questions reject every distractor satisfying their predicate.
Order extrema are evaluated against all shown options. Racing has three options;
other selection questions have four. Digit formation uses two distinct digits
and one distractor; the engine retains its existing per-level scoring behavior.

Adaptive uses the existing flag, ratio, weak-goal criteria and lesson-scoped
progress API. Its reserved rounds sample fresh tasks from weak goals; remaining
rounds cycle through shuffled supported goals. Normal sessions cover every
supported goal, with counts differing by at most one.

Dynamic Vietnamese instructions use the existing `voiceFallback` TTS path.
Number-to-reading questions ask the child to read the displayed number without
speaking the matching answer. Other voices state the task without its solution.
Shared intro, feedback, completion voices, scoring and session persistence are
retained. Vietnamese audio requires the browser's speech synthesis support.

## Files

- `src/app/game/lop-2/toan/bai-1/lesson.ts`: lesson and ten keys.
- `content.ts`: bank, sampler, number reading and reserved future content.
- `config.ts`: adaptive loading and four adapters/configs.
- `page.tsx`, each game's `page.tsx` and `GameClient.tsx`: game navigation/routes.
- `drag-drop/lesson.module.css`: lesson-only sizing for text cards.
- `src/app/game/lop-2/toan/bai-{3..10}/page.tsx`: coming-soon routes.
- `src/components/games/general/tracking/lesson-catalog.ts`: registration.
- `src/components/games/navigation/catalog.ts`: ten Grade 2 mathematics items.
- `src/lib/game-progress/config.ts`: ten Grade 2 mathematics progress entries,
  four available games for lesson 1, and the existing two-game completion rule.
- `scripts/test-game-me-progress.cjs`: update Grade 2 expectations now that its
  mathematics lesson is available; keep the empty-subject check for Vietnamese.
- `scripts/test-toan-2-bai-1.cjs`: content, randomness, adapters and adaptive tests.

Run `node scripts/test-toan-2-bai-1.cjs`, `npm run typecheck`, `npm run lint`,
and `npm run build`. Content tests exercise every bank item and 480 sessions,
including adaptive weighting, replay diversity, all answer positions, matching
keys, distinct digit cards and all four config loaders. They do not substitute
for a manual playthrough with browser audio and a signed-in persistence check.
