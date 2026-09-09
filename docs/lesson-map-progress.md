# Lesson map progress (signed-in users)

The three grade-one maps load `/api/game-tracking/lesson-map` through the existing auth retry helper. Guests retain the existing demo input; this feature does not store or merge guest progress.

## Configuration

Edit `src/components/games/lesson-map/progress-config.ts` when publishing a lesson:

- `available`: whether the lesson can be selected, independently of previous lessons.
- `games`: existing tracking game IDs belonging to the lesson.
- `requiredGames`: distinct finished games required for completion.
- Optional `starMilestones.twoStars` and `starMilestones.fourStars` are supported by the progress model.

Currently published: math lessons 1–2 and English lesson 1, each with four games and two required. Vietnamese lessons remain locked until content and tracking are registered. Keep game IDs and completion requirements stable for released lessons. Closing availability does not revoke completion; changing requirements or removing counted game IDs can change derived completion and requires a separate product decision/versioning strategy.

## Storage and loading

No schema change or database writes are introduced. Read existing `learning_progress.games[gameId].completedAt`, then supplement missing game entries from the user's completed session history. History queries batch lesson IDs (30 per query), with no recent-session limit. User-scoped aggregate reads also support older documents without grade/subject fields. Results are filtered to the requested map and deduplicated by lesson/game ID. Users without an `activeGame` aggregate are covered by session history.

The client refreshes when returning to the page, on focus/visibility changes, and after `game-tracking:saved`. It clears progress when user or subject changes and offers retry on failure; signed-in users never receive demo achievements as a fallback.

## Verification

Run `node scripts/test-lesson-map.cjs` and `npm run typecheck`.

For a live smoke check, sign in and finish two different games in math lesson 1: the map should show three stars and a green check, with lesson 2 recommended. Replaying the same game should not increase stars. Confirm another account starts with its own progress, and verify the mobile five-star row fits the node.
