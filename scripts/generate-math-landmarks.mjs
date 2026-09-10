// Original lightweight vector artwork, matching the math map's flat SVG style.
// Run from the repository root to regenerate the shared assets.
import { mkdirSync, writeFileSync } from 'node:fs'

const path = (d, fill = '#ffc96b') => `<path d="${d}" fill="${fill}"/>`
const circle = (x, y, r, fill = '#fff4cd') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`
const eyes = circle(26, 29, 2, '#294f59') + circle(38, 29, 2, '#294f59')
const fish = (color) => path('M12 32Q27 10 46 30L58 19V45L46 35Q27 54 12 32Z', color) + circle(23, 29, 2, '#294f59')
const shell = path('M32 53L8 26Q7 9 20 13Q30 2 40 13Q56 8 57 26Z', '#ffa6b6') + path('M32 49L20 19M32 49V15M32 49L45 19', 'none')
const boat = path('M6 39H58L48 53H18Z', '#b88150') + path('M12 57Q23 52 32 57T55 57', 'none')
const chest = path('M10 30H54V53H10Z', '#bd7845') + path('M10 30V21Q32 8 54 21V30Z', '#df9853') + path('M18 18V53M46 18V53', 'none') + path('M28 30H36V40H28Z', '#ffe07a')
const palm = path('M29 56Q37 37 31 20', 'none') + path('M31 23Q9 2 5 27Q18 18 31 23M31 23Q41 0 59 18Q42 15 31 23M31 23Q53 16 57 38Q42 26 31 23', '#53bd83')
const map = path('M8 12L23 8L42 13L56 8V51L42 56L23 51L8 56Z', '#ffe4a6') + path('M16 38Q20 20 30 34T46 25M42 21L50 29M50 21L42 29', 'none')
const coin = (x,y) => circle(x,y,10,'#ffd25f') + path(`M${x-3} ${y-4}h6m-3 -2v12m-3 -2h6`, 'none')
const entries = [
  ['crab', 'Cua biển', path('M18 35L7 27M18 40L5 43M46 35L57 27M46 40L59 43', 'none') + path('M7 28Q-1 15 9 12L10 20L17 14Q21 26 7 28M57 28Q65 15 55 12L54 20L47 14Q43 26 57 28', '#ff836f') + path('M14 36Q14 21 32 23Q50 21 50 36Q49 49 32 49Q15 49 14 36', '#ff836f') + eyes],
  ['shrimp', 'Tôm', path('M47 14Q17 1 12 28Q10 55 39 53L48 43L38 37Q25 45 22 32Q20 20 39 24Z', '#ffa28c') + path('M39 19Q48 0 60 9M38 20Q52 8 59 20M14 29L23 32M17 42L26 40', 'none') + circle(38,18,2,'#294f59')],
  ['squid', 'Mực', path('M32 5L51 30L44 38H20L13 30Z', '#bda0e5') + path('M21 36Q10 58 21 57M28 36V56M36 36V56M43 36Q54 58 43 57', 'none') + eyes],
  ['octopus', 'Bạch tuộc', path('M16 32Q11 6 32 7Q53 6 48 32Q62 50 54 54Q46 59 42 42Q43 61 34 57L30 43Q27 63 20 56L22 42Q9 61 6 49Z', '#cc93cf') + eyes],
  ['starfish', 'Sao biển', path('M32 5L39 23L59 24L44 37L49 57L32 45L15 57L20 37L5 24L25 23Z', '#ffac78') + eyes],
  ['seashell', 'Vỏ sò', shell],
  ['sea-snail', 'Ốc biển', path('M10 49Q21 36 47 38L57 53H10Z', '#ffcfa2') + circle(31,29,20,'#eea78c') + path('M39 34Q20 42 20 27Q21 16 32 19Q42 24 31 29', 'none')],
  ['lobster', 'Tôm hùm', path('M24 25L10 14M40 25L54 14M21 34H9M43 34H55M24 43L13 50M40 43L51 50', 'none') + circle(9,12,7,'#f67b67') + circle(55,12,7,'#f67b67') + path('M22 22Q32 12 42 22L38 48L46 57H18L26 48Z', '#f67b67') + eyes],
  ['tropical-fish', 'Cá nhiệt đới', fish('#ffcb59') + path('M32 18V45M40 22V41', 'none')],
  ['pufferfish', 'Cá nóc', path('M13 20L6 14M32 13V5M48 20L57 12M51 38L59 43M32 51V59M13 40L5 46', 'none') + circle(32,32,21,'#ffd276') + eyes + circle(32,40,3,'#ffc0a0')],
  ['jumping-fish', 'Cá nhảy khỏi mặt nước', `<g transform="rotate(-32 32 32)">${fish('#68bfdc')}</g>` + path('M7 57Q19 49 30 56T58 54', 'none')],
  ['shark-fin', 'Vây cá mập', path('M12 48Q38 31 35 7Q50 22 51 48Z', '#83a9bf') + path('M5 52Q19 45 31 52T59 52', 'none')],
  ['dolphin', 'Cá heo', path('M5 40Q17 8 42 17L51 11L49 23Q57 33 53 43L61 51L48 49Q42 31 29 33L25 45L20 33L8 46Z', '#72c1d8') + circle(16,32,2,'#294f59')],
  ['whale-tail', 'Đuôi cá voi', path('M24 53Q31 35 16 31Q4 28 5 10Q24 9 32 26Q40 9 59 10Q60 28 48 31Q33 35 40 53Z', '#789bce') + path('M7 56Q20 50 31 55T57 55', 'none')],
  ['sea-turtle', 'Rùa biển', path('M18 24L8 12L5 22L16 31M46 24L56 12L59 22L48 31M19 42L9 54L21 53M45 42L55 54L43 53', '#75c9a1') + circle(32,13,9,'#75c9a1') + circle(32,34,20,'#5fac7a') + path('M24 24H40L44 37L32 46L20 37Z', '#9cd286')],
  ['jellyfish', 'Sứa', path('M11 34Q9 7 32 7Q55 7 53 34Z', '#eda4ce') + path('M17 36Q10 46 20 57M28 36Q21 48 30 58M39 36Q32 47 40 57M49 36Q44 47 52 54', 'none') + eyes],
  ['red-coral', 'San hô đỏ', path('M29 56V17M29 36L14 26V12M29 45L48 32V13M14 23L6 19M48 27L58 20M29 25L38 16', 'none')],
  ['branch-coral', 'San hô dạng nhánh', path('M31 57V25L23 10M31 35L13 35L6 23M31 46L48 37L57 24M48 37V14M13 35L12 49M31 25L38 8', 'none')],
  ['pearl-shell', 'Trai ngọc', shell + path('M8 45Q32 27 56 45Q35 64 8 45Z', '#cc98ca') + circle(32,40,12)],
  ['pearl', 'Ngọc trai lớn', circle(32,33,23,'#e6edf8') + circle(25,24,7,'#ffffff') + path('M39 6V14M35 10H43', 'none')],
  ['anchor', 'Mỏ neo', circle(32,11,7,'#a3ccd7') + path('M32 18V55M19 27H45M8 36Q10 55 32 55Q54 55 56 36M8 36L5 46M8 36L18 39M56 36L59 46M56 36L46 39', 'none')],
  ['lifebuoy', 'Phao cứu sinh', circle(32,32,25,'#fff5db') + path('M15 12L24 24M40 40L49 52M12 49L24 40M40 24L52 15', 'none') + circle(32,32,12,'#80d5df')],
  ['wooden-boat', 'Thuyền gỗ nhỏ', boat + path('M18 20L44 48M12 16L20 13L28 24L23 28Z', '#dcaa6b')],
  ['sailboat', 'Thuyền buồm', boat + path('M31 38V5L8 33H28M35 12L53 33H35Z', '#fff2cf')],
  ['speedboat', 'Cano', path('M5 39L58 31L48 50H17Z', '#ff927e') + path('M20 36L28 19H40L46 34Z', '#b4e4f0') + path('M7 56H45', 'none')],
  ['ship', 'Tàu biển', path('M5 39H59L49 54H16Z', '#789ac8') + path('M15 21H49V39H15Z', '#fff0ce') + path('M21 10H31V21H21Z', '#ed9b7f') + circle(23,30,3,'#7dc6dc') + circle(40,30,3,'#7dc6dc')],
  ['pirate-flag', 'Cờ hải tặc', path('M13 57V7', 'none') + path('M14 9Q25 3 36 10T57 10V37Q45 43 35 36T14 35Z', '#54647c') + circle(35,21,7) + path('M27 30L43 17M27 17L43 30', 'none')],
  ['treasure-map', 'Bản đồ kho báu', map],
  ['compass', 'La bàn', circle(32,33,25,'#f4cc77') + circle(32,33,19,'#fff3d5') + path('M40 16L37 38L24 50L27 28Z', '#e68a7b')],
  ['telescope', 'Kính viễn vọng', path('M31 34V46M31 43L18 58M31 43L46 58', 'none') + path('M8 29L47 9L56 27L17 44Z', '#eabd69') + path('M44 9L51 6L61 27L54 30Z', '#87b6c8')],
  ['gold-bag', 'Túi vàng', path('M22 8H42L37 22Q62 48 48 55H16Q2 48 27 22Z', '#dda76a') + path('M24 22H40', 'none') + coin(32,39)],
  ['treasure-chest', 'Rương kho báu đóng', chest],
  ['open-treasure-chest', 'Rương kho báu mở', path('M10 28L7 10L50 5L54 23Z', '#bd7845') + coin(23,28) + coin(40,27) + path('M10 33H54V55H10Z', '#cf8e4f') + path('M28 33H36V44H28Z', '#ffe07a')],
  ['gold-coins', 'Chồng đồng vàng', coin(18,44) + coin(34,46) + coin(47,39) + coin(29,29)],
  ['blue-gem', 'Đá quý xanh', path('M16 12H48L59 29L32 56L5 29Z', '#71cfe8') + path('M16 12L24 29L32 56L40 29L48 12M5 29H59M24 29L32 12L40 29', 'none')],
  ['message-bottle', 'Chai thư', path('M28 5H40V21L49 30V54Q32 61 15 54V30L28 21Z', '#9edbcf') + path('M27 4H41V12H27Z', '#be9564') + path('M23 31H41V49H23Z', '#fff0c8')],
  ['scroll-map', 'Cuộn bản đồ', path('M14 12H49V52H17Q6 52 7 43V16Q7 7 17 10V43H53Q62 56 49 56H17', '#ffe0a3') + path('M23 22Q43 20 31 32M27 38L36 46M36 38L27 46', 'none')],
  ['golden-key', 'Chìa khóa vàng', circle(21,20,14,'#ffce60') + circle(21,20,6,'#fff0c4') + path('M30 30L53 53L59 47L53 41L47 47L41 41L46 36L39 30Z', '#ffce60')],
  ['island-lantern', 'Đèn biển', path('M24 13Q22 2 32 3Q42 2 40 13M17 23H47L43 52H21Z', '#ffe6a2') + path('M14 22L23 12H41L50 22ZM17 53H47', '#6e9eac') + path('M32 27V45', 'none')],
  ['lighthouse', 'Hải đăng', path('M19 57L25 22H39L45 57Z', '#fff0d8') + path('M23 34H41L42 42H22Z', '#f18c7c') + path('M22 12H42V24H22Z', '#ffe58c') + path('M18 12L32 3L46 12Z', '#e77f70') + path('M7 16H15M49 16H57', 'none')],
  ['beach-hut', 'Lều trên đảo', path('M15 28H49V52H15Z', '#dcac6d') + path('M5 29L32 7L59 29Z', '#e8c577') + path('M27 36H38V52H27Z', '#89694e') + path('M18 52V59M46 52V59', 'none')],
  ['hammock', 'Võng', path('M9 7V58M55 7V58', 'none') + path('M9 22Q32 46 55 22Q43 61 22 45Z', '#f0a88b') + path('M17 31L25 45M28 38L35 48M40 36L43 42', 'none')],
  ['coconuts', 'Trái dừa', circle(22,35,17,'#ae8257') + circle(42,39,17,'#ae8257') + circle(42,36,12,'#fff0d6') + circle(42,36,7,'#d3a16b') + circle(18,30,2,'#755737')],
  ['double-palm', 'Hai cây dừa', `<g transform="translate(0 8) scale(.75)">${palm}</g><g transform="translate(22 0) scale(.72)">${palm}</g>`],
  ['tropical-flower', 'Hoa nhiệt đới', path('M32 58V34L51 42L34 49', '#74bd83') + circle(20,20,12,'#f6a5b8') + circle(41,19,12,'#f6a5b8') + circle(44,37,12,'#f6a5b8') + circle(23,39,12,'#f6a5b8') + circle(32,28,9,'#ffda74')],
  ['sea-rock', 'Tảng đá biển', path('M7 50L16 25L36 13L52 27L59 50Z', '#9cb7b5') + path('M16 25L34 29L36 13M34 29L43 50', 'none') + path('M5 56Q22 50 34 55T59 54', 'none')],
  ['cave', 'Hang đá', path('M4 55L12 27L26 11L45 16L58 36L61 55Z', '#97aaa4') + path('M20 55V39Q32 19 44 39V55Z', '#536a70')],
  ['volcano', 'Núi lửa', path('M5 57L24 21H41L59 57Z', '#ab998b') + path('M24 21H41L46 33L38 30L33 41L27 31L18 34Z', '#f28f6d') + circle(29,12,6,'#d1d5cc') + circle(39,7,5,'#d1d5cc')],
  ['waterfall', 'Thác nước nhỏ', path('M6 55L11 13H47L59 55Z', '#94b7a3') + path('M25 14H39L38 38L48 54H19L28 36Z', '#82d8e9') + path('M31 18V37L27 49M36 42L40 51', 'none') + path('M12 57Q31 50 54 57', 'none')],
  ['sand-castle', 'Lâu đài cát', path('M8 56V27H15V20H21V27H26V15H38V27H43V20H49V27H56V56Z', '#efcc88') + path('M27 56V43Q32 35 37 43V56Z', '#bd965b') + path('M32 15V4L44 8L32 12', '#f1937e')],
]
const directory = 'public/games/general/images/map-island-icons'
mkdirSync(directory, { recursive: true })
for (const [id,, artwork] of entries) {
  const stroke = id.includes('coral') ? '#de817d' : '#526d71'
  writeFileSync(`${directory}/${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="${stroke}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${artwork}</g></svg>\n`)
}
const categories = ['sea-life', 'ocean', 'voyage', 'treasure', 'mystery-island']
const checkpoints = [10, 20, 30, 32, 33, 40, 47, 48, 50]
const large = ['sailboat', 'treasure-chest', 'open-treasure-chest', 'lighthouse', 'cave', 'volcano', 'waterfall', 'sand-castle']
const small = ['starfish', 'seashell', 'pearl', 'golden-key', 'coconuts']
const config = entries.map(([id, alt], i) => `  { id: '${id}', src: '/games/general/images/map-island-icons/${id}.svg', alt: '${alt}', category: '${categories[Math.floor(i / 10)]}', position: '${large.includes(id) ? 'back-right' : ['shrimp','squid','jumping-fish','shark-fin','dolphin','whale-tail','wooden-boat','speedboat','ship'].includes(id) ? 'water-right' : 'front-right'}', scale: ${small.includes(id) ? 0.85 : large.includes(id) ? 1.1 : 1}, checkpoint: ${checkpoints.includes(i + 1)} },`).join('\n')
writeFileSync('src/components/games/lesson-map/mathIslandLandmarks.ts', `// Shared visual identities for every math grade. No lesson or database IDs.\nexport type IslandLandmarkPosition = 'front-left' | 'front-center' | 'front-right' | 'back-left' | 'back-center' | 'back-right' | 'water-left' | 'water-right'\nexport type IslandLandmarkConfig = {\n  id: string\n  src: string\n  alt: string\n  category: 'sea-life' | 'ocean' | 'voyage' | 'treasure' | 'mystery-island'\n  position: IslandLandmarkPosition\n  scale?: number\n  rotate?: number\n  offsetX?: number\n  offsetY?: number\n  checkpoint?: boolean\n}\n\nexport const MATH_ISLAND_LANDMARKS: readonly IslandLandmarkConfig[] = [\n${config}\n]\n\n/** One-based order within a grade; cycles safely after lesson 50. */\nexport function getMathIslandLandmark(lessonOrder: number): IslandLandmarkConfig {\n  const index = Number.isFinite(lessonOrder) ? Math.max(0, Math.trunc(lessonOrder) - 1) : 0\n  return MATH_ISLAND_LANDMARKS[index % MATH_ISLAND_LANDMARKS.length]\n}\n`)
