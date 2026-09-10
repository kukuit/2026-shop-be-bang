# Ki?m tra ?nh ? 2026-09-10

Ph?m vi: m? ngu?n hi?n t?i trong src v? 114 file ?nh trong public, bao g?m thay ??i ch?a commit. Kh?ng s?a m? ?ng d?ng. ??y l? audit t?nh v? ?o byte/k?ch th??c file; ch?a ch?y Lighthouse, tr?nh duy?t, FPS ho?c ?o production. Kh?ng bao g?m URL ?nh ??ng l?y t? database/t?i kho?n b?n ngo?i. ???ng d?n template ?? ki?m tra ri?ng; d? li?u JSON l? k?t qu? qu?t literal, kh?ng ph?i to?n b? request runtime.

## K?t lu?n

40 c?p ?nh g?c/optimize: 55.477.525 ? 12.598.237 byte (52,91 ? 12,02 MiB), gi?m 77,29%. ??y l? t?ng kho ?nh theo c?p, kh?ng ph?i t?i c?a m?t trang. T?t c? PNG optimize gi? nguy?n k?ch th??c pixel v? d?ng indexed color (PNG color type 3). ??y l? n?n b?ng m?u; kh?ng th? g?i l? b?o to?n ch?t l??ng ch? d?a tr?n dung l??ng. C?n xem c?nh trong su?t, gradient v? ch? ? k?ch th??c hi?n th? th?c.

## Ch?a chuy?n sang optimize d? ?? c? file t??ng ?ng

12 v? tr?, 10 URL duy nh?t:

| V? tr? | URL hi?n t?i |
| --- | --- |
| src/app/game/lop-1/tieng-anh/bai-1/images.ts:3 | /games/lessons/lop-1/tieng-anh/bai-1/images/vocabulary.png |
| src/app/game/lop-1/tieng-anh/bai-1/page.tsx:10 | /games/gold-mining/images/thumbnail/thumbnail.jpg |
| src/app/game/lop-1/tieng-anh/bai-1/page.tsx:11 | /games/racing/images/thumbnail/thumbnail.jpg |
| src/app/game/lop-1/toan/bai-2/page.tsx:10 | /games/gold-mining/images/thumbnail/thumbnail.jpg |
| src/app/game/lop-1/toan/bai-2/page.tsx:11 | /games/racing/images/thumbnail/thumbnail.jpg |
| src/components/auth/GameAuthHeader.tsx:27 | /images/logo.png |
| src/components/games/profile/GameEntry.tsx:28 | /games/general/images/loading-cappy-adventure.png |
| src/components/games/racing/RacingScene.ts:83 | /games/racing/images/valley-road-v2.png |
| src/components/games/racing/RacingScene.ts:84 | /games/racing/images/cappy-red-car.png |
| src/components/games/racing/RacingScene.ts:85 | /games/racing/images/answer-rock.png |
| src/components/games/racing/RacingScene.ts:86 | /games/racing/images/answer-barrel.png |
| src/components/games/racing/RacingScene.ts:87 | /games/racing/images/wolf-car-states.png |

Ngo?i ra, hai trang src/app/game/lop-1/toan/bai-2/page.tsx v? src/app/game/lop-1/tieng-anh/bai-1/page.tsx, d?ng 8?9, c?n tr? thumbnail-v2.png c?a bubble-shooter/drag-drop ?? b? x?a. Thay b?ng images/optimize/thumbnail/thumbnail.png t??ng ?ng. T?ng 4 v? tr? ?nh l?i n?y t?ch ri?ng kh?i 12 v? tr? ? b?ng tr?n.

## Tham chi?u thi?u kh?c

- src/app/products/page.tsx:32,39,46,53,60,67: s?u ?nh orange-*.jpg kh?ng c?n trong public.
- src/app/products/layout.tsx:40: URL OG tuy?t ??i c?n tr? orange-1.jpg. src/app/contact/layout.tsx:40: URL OG tr? /images/banner-orange-1.png kh?ng c? trong public. Ch?a ki?m tra HTTP tr?n domain production.
- src/app/game/lop-1/tieng-anh/bai-1/content.ts:6?14 khai b?o ball/bill/book/bike/greeting/farewell.png b?ng ROOT template nh?ng c?c file n?y kh?ng c?. Lu?ng c?u h?i hi?n d?ng symbol v? atlas vocabulary trong images.ts; ch?a c? b?ng ch?ng s?u ???ng d?n n?y ???c request, n?n ch?a t?nh l? s?u ?nh h?ng hi?n th?.
- C?c icon *-v2 trong middleware allowlist kh?ng c? file, nh?ng allowlist t? n? kh?ng ph?t sinh t?i ?nh.
- ChatWidget.tsx:27 c?n fallback ???ng d?n thumbnail kh?ng optimize, c?n l?u ? khi b? sung game m?i.

## ??nh gi? performance

- RacingScene t?i 5 ?nh: 8.192.650 ? 1.910.930 byte n?u ??i sang c?c b?n optimize ?? c?, gi?m 76,68%. ??y l? l?i ?ch tr?c ti?p l?n nh?t c?n b? s?t.
- Atlas vocabulary: kho?ng 1.134 ? 218 KiB; gi? k?ch th??c 1298?1212 ph? h?p v?i frame coordinates hi?n c?.
- GameShell.tsx:62?68 hi?n th? avatar 34?34 CSS pixel nh?ng t?i PNG 1254?1254, kho?ng 315 KiB, v?i unoptimized. N?n xu?t b?n avatar nh? theo DPR ho?c d?ng Next Image optimization; ??ng b? n?i preload n?u ??i URL ?? tr?nh t?i c? hai b?n.
- GameLoadingScreen.tsx:80?90 d?ng ba ?nh ready v?i priority v? unoptimized: t?ng kho?ng 705 KiB. N?n c? b?n ri?ng theo k?ch th??c UI th?c t? v? ki?m tra th?i ?i?m preload.
- ChatWidget.tsx:37 d?ng thumbnail 240?240 v?i unoptimized; PNG thumbnail kho?ng 402/453 KiB d? ngu?n 1254?1254. C? th? d?ng Next Image ho?c thumbnail WebP ??ng k?ch th??c.
- Sprite sheet gi? k?ch th??c l? quy?t ??nh h?p l? v? Phaser/CSS ?ang c?t theo frame c? ??nh. Kh?ng resize sheet n?u ch?a c?p nh?t frameWidth/frameHeight v? t?a ?? atlas. unoptimized cho sprite kh?ng t? ??ng l? l?i.
- BubbleMathScene n?p ri?ng ?nh kho?ng 2,58 MiB; GoldMinerScene kho?ng 2,66 MiB, ch?a g?m audio, UI, atlas b?i h?c v? JavaScript. T?ng pixel c?a c?c texture n?y t??ng ???ng kho?ng 52,79/48,00 MiB RGBA8, ch? l? ??c t?nh m?t b?n texture, kh?ng ph?i ?o GPU th?c t?. N?n PNG kh?ng gi?m s? pixel n?y.
- Trang ch? v? LessonGameGrid ?? d?ng next/image v?i sizes ? nhi?u ?nh; racing/gold-miner t?i Phaser b?ng import ??ng. ??y l? c?c ?i?m t?t, ch?a thay th? ?o th?c t?.
- next.config.mjs ch?a c? cache policy ri?ng cho /games/.../images/optimize. C?n ?o Cache-Control/CDN tr?n production; khi d?ng cache d?i ph?i c? version/hash URL tr??c khi thay n?i dung ?nh.
- B?n ?nh s?n ph?m .webp ngo?i optimize, favicon v? hai SVG b?n ?? kh?ng ph?i l?i ch? v? n?m ngo?i folder. T?n folder kh?ng quy?t ??nh ?nh ?? ???c t?i ?u hay ch?a.
- Kh?ng th?y script/pipeline t?i ?u ?nh trong scripts/package.json: n?n c? quy t?c xu?t ?nh, gi? b?n g?c v? ki?m tra ???ng d?n trong CI ?? tr?nh l?p l?i l?i migration.

## Th? t? x? l? ?? xu?t

1. S?a 4 thumbnail l?i v? x?c ??nh x? l? 6 ?nh s?n ph?m b? x?a.
2. Chuy?n 12 v? tr? ?? c? b?n optimize; ??i chi?u h?nh sprite tr??c/sau.
3. Xu?t b?n nh? cho avatar, ?nh ready, thumbnail; th? WebP/AVIF cho h?nh th?ng th??ng, gi? atlas ph? h?p renderer.
4. ?o production build tr?n mobile: cold/warm cache, LCP/CLS/INP, byte ?nh, th?i gian v?o game v? FPS tr?n thi?t b? y?u. Hi?n ch?a c? s? li?u ?? x?c nh?n to?n h? th?ng ch?y performance t?t.

T?i li?u tham kh?o: https://nextjs.org/docs/14/app/api-reference/components/image (unoptimized, sizes v? caching). B?ng byte v? tham chi?u m?y ??c ???c: image-audit-data.json.
