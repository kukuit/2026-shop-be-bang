# Main source comparison — 2026-09-10

Compared the full tracked working tree with `origin/main` after a successful `git fetch origin main`.

- Current branch: `dell`, HEAD `7952394`.
- Fetched main: `1617434` (PR #39).
- Local branch named `main`: `7d69f79`, 47 commits behind `origin/main`; this is not the current main source.
- `dell` has one unique commit; main has six commits absent from dell's ancestry. Nevertheless, much of their source is already present in `7952394`. The current tree contains a mixture of main changes and older page implementations; Git ancestry alone does not describe which source was copied across.

## Missing main changes restored

These files now match fetched main exactly:

- `src/app/game/lop-1/tieng-anh/page.tsx`: account progress, title “Vũ trụ tiếng Anh”, no tagline, overview disabled.
- `src/app/game/lop-1/tieng-viet/page.tsx`: account progress, title “Vùng đất tiếng Việt”, no tagline, overview disabled (restored in the preceding task).
- `src/components/games/profile/GameEntry.tsx`: shared `CappyJourneyLoading` instead of duplicated older loading markup.

## Chatbot verification

`src/app/api/chat/`, all tracked files under `src/lib/`, and `CappyChatPrompt.tsx` / `CappyChatPrompt.module.css` match main. The learning-progress chatbot and waving Cappy prompt are present.

`ChatWidget.tsx` differs only in thumbnail optimization: the generic thumbnail path uses `/optimize/` and Next Image uses `sizes="220px"` instead of `unoptimized`. These differences belong to dell's image optimization work, not missing chatbot functionality.

The earlier chatbot commit `6478d8d` is already an ancestor. Main later added map-label/account/loading changes in `1939e8e` and `92b5422`, followed by image optimization in `8966372`. Having the chatbot does not imply every later main change was integrated.

## Remaining intentional differences

From dell commit `7952394`:

- Five image-audit documents: `image-audit-2026-09-10.md`, `image-audit-data.json`, `image-performance-notes.md`, `image-reference-notes.md`, `images-without-optimize.json`.
- Removed old shop files: `src/app/api/mktonline-orders/route.ts`, `src/app/contact/{layout,page}.tsx`, `src/app/products/{layout,page}.tsx`.
- Corresponding shop navigation/sitemap removals in `HeaderTop.tsx` and `src/app/sitemap.ts`.
- Image-loading improvements in `ChatWidget.tsx`, `GameLoadingScreen.tsx` and `GameShell.tsx`.

From the current working session:

- Shared math landmarks: three map renderer edits, three new landmark source files, generator and 50 SVG assets.
- Lesson-map README updates and authenticated Vietnamese API regression assertions in `scripts/test-lesson-map.cjs`.
- This audit document.

All remaining tracked differences were reviewed and fall into these groups. No full branch merge, reset, commit or push was performed; existing local work is preserved. Source synchronization here does not update dell's Git ancestry.
