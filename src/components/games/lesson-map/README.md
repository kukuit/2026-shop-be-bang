# Lesson journeys

`LessonJourneyMap` is the shared renderer for every subject and grade. It owns responsive snake positioning, measured SVG paths, locked feedback, navigation through `LessonJourneyNode`, and optional scroll to the current lesson. `LessonStars` and `ClassProgress` are shared presentation components.

- Math: `LessonMap` preserves its existing API and supplies `theme="ocean"`.
- English: the route supplies `theme="space"` and items built from `englishData.ts`; the shared node selects `PlanetArtwork`.
- Vietnamese (Vùng đất chữ): the route supplies `theme="adventure"` and items built from `vietnameseData.ts`; the shared node selects `AdventureLocationArtwork` using each definition's `nodeType` and `isCheckpoint`, with `mapTitle` as the visible place name using the shared plain label style; artwork contains no text. Ten literacy scenes use a bright sky/grass/water palette, gently staggered positions, and a single dashed dirt path that joins scene edges. The demo has 1/10 completed, lesson 2 current and lesson 3 available. Bài 1–10 currently use ComingSoon destinations. Current number badges remain blue across all three themes.
- Another grade: supply new definitions and grade/subject labels to the same renderer.
- Another visual theme: extend `JourneyTheme`, theme CSS, decorations and artwork selection. Keep layout, node interactions and progress merging shared.

Definitions contain stable `lessonId`, display content and the existing destination route. `buildLessonMapData(definitions, progress)` merges separately loaded progress; the first unlocked incomplete item becomes current, other unlocked items remain available. Completed items always remain replayable. English uses existing `tieng-anh-1-bai-*` IDs to match lesson tracking.

English currently uses demo progress (2 completed, Unit 3 current). Replace the fixture at the route boundary with real progress when available, and enable `autoScroll` after loading it. No database migration is needed here. Units without game content use the existing ComingSoon presentation through the bounded `bai-3`–`bai-16` fallback route.

Run `node scripts/test-lesson-journey.cjs`, `npm run typecheck`, and scoped Next lint. Browser verification should cover 1920, 1440, 1280, 768, 390 and 375px, including resize, keyboard activation, locked feedback and the ocean route.
