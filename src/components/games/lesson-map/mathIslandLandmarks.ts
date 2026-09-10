// Shared visual identities for every math grade. No lesson or database IDs.
export type IslandLandmarkPosition = 'front-left' | 'front-center' | 'front-right' | 'back-left' | 'back-center' | 'back-right' | 'water-left' | 'water-right'
export type IslandLandmarkConfig = {
  id: string
  src: string
  alt: string
  category: 'sea-life' | 'ocean' | 'voyage' | 'treasure' | 'mystery-island'
  position: IslandLandmarkPosition
  scale?: number
  rotate?: number
  offsetX?: number
  offsetY?: number
  checkpoint?: boolean
}

export const MATH_ISLAND_LANDMARKS: readonly IslandLandmarkConfig[] = [
  { id: 'crab', src: '/game/math/island-icons/crab.svg', alt: 'Cua biển', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'shrimp', src: '/game/math/island-icons/shrimp.svg', alt: 'Tôm', category: 'sea-life', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'squid', src: '/game/math/island-icons/squid.svg', alt: 'Mực', category: 'sea-life', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'octopus', src: '/game/math/island-icons/octopus.svg', alt: 'Bạch tuộc', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'starfish', src: '/game/math/island-icons/starfish.svg', alt: 'Sao biển', category: 'sea-life', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'seashell', src: '/game/math/island-icons/seashell.svg', alt: 'Vỏ sò', category: 'sea-life', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'sea-snail', src: '/game/math/island-icons/sea-snail.svg', alt: 'Ốc biển', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lobster', src: '/game/math/island-icons/lobster.svg', alt: 'Tôm hùm', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'tropical-fish', src: '/game/math/island-icons/tropical-fish.svg', alt: 'Cá nhiệt đới', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pufferfish', src: '/game/math/island-icons/pufferfish.svg', alt: 'Cá nóc', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: true },
  { id: 'jumping-fish', src: '/game/math/island-icons/jumping-fish.svg', alt: 'Cá nhảy khỏi mặt nước', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'shark-fin', src: '/game/math/island-icons/shark-fin.svg', alt: 'Vây cá mập', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'dolphin', src: '/game/math/island-icons/dolphin.svg', alt: 'Cá heo', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'whale-tail', src: '/game/math/island-icons/whale-tail.svg', alt: 'Đuôi cá voi', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'sea-turtle', src: '/game/math/island-icons/sea-turtle.svg', alt: 'Rùa biển', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'jellyfish', src: '/game/math/island-icons/jellyfish.svg', alt: 'Sứa', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'red-coral', src: '/game/math/island-icons/red-coral.svg', alt: 'San hô đỏ', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'branch-coral', src: '/game/math/island-icons/branch-coral.svg', alt: 'San hô dạng nhánh', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pearl-shell', src: '/game/math/island-icons/pearl-shell.svg', alt: 'Trai ngọc', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pearl', src: '/game/math/island-icons/pearl.svg', alt: 'Ngọc trai lớn', category: 'ocean', position: 'front-right', scale: 0.85, checkpoint: true },
  { id: 'anchor', src: '/game/math/island-icons/anchor.svg', alt: 'Mỏ neo', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lifebuoy', src: '/game/math/island-icons/lifebuoy.svg', alt: 'Phao cứu sinh', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'wooden-boat', src: '/game/math/island-icons/wooden-boat.svg', alt: 'Thuyền gỗ nhỏ', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'sailboat', src: '/game/math/island-icons/sailboat.svg', alt: 'Thuyền buồm', category: 'voyage', position: 'back-right', scale: 1.1, checkpoint: false },
  { id: 'speedboat', src: '/game/math/island-icons/speedboat.svg', alt: 'Cano', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'ship', src: '/game/math/island-icons/ship.svg', alt: 'Tàu biển', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'pirate-flag', src: '/game/math/island-icons/pirate-flag.svg', alt: 'Cờ hải tặc', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'treasure-map', src: '/game/math/island-icons/treasure-map.svg', alt: 'Bản đồ kho báu', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'compass', src: '/game/math/island-icons/compass.svg', alt: 'La bàn', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'telescope', src: '/game/math/island-icons/telescope.svg', alt: 'Kính viễn vọng', category: 'voyage', position: 'front-right', scale: 1, checkpoint: true },
  { id: 'gold-bag', src: '/game/math/island-icons/gold-bag.svg', alt: 'Túi vàng', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'treasure-chest', src: '/game/math/island-icons/treasure-chest.svg', alt: 'Rương kho báu đóng', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'open-treasure-chest', src: '/game/math/island-icons/open-treasure-chest.svg', alt: 'Rương kho báu mở', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'gold-coins', src: '/game/math/island-icons/gold-coins.svg', alt: 'Chồng đồng vàng', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'blue-gem', src: '/game/math/island-icons/blue-gem.svg', alt: 'Đá quý xanh', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'message-bottle', src: '/game/math/island-icons/message-bottle.svg', alt: 'Chai thư', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'scroll-map', src: '/game/math/island-icons/scroll-map.svg', alt: 'Cuộn bản đồ', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'golden-key', src: '/game/math/island-icons/golden-key.svg', alt: 'Chìa khóa vàng', category: 'treasure', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'island-lantern', src: '/game/math/island-icons/island-lantern.svg', alt: 'Đèn biển', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lighthouse', src: '/game/math/island-icons/lighthouse.svg', alt: 'Hải đăng', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'beach-hut', src: '/game/math/island-icons/beach-hut.svg', alt: 'Lều trên đảo', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'hammock', src: '/game/math/island-icons/hammock.svg', alt: 'Võng', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'coconuts', src: '/game/math/island-icons/coconuts.svg', alt: 'Trái dừa', category: 'mystery-island', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'double-palm', src: '/game/math/island-icons/double-palm.svg', alt: 'Hai cây dừa', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'tropical-flower', src: '/game/math/island-icons/tropical-flower.svg', alt: 'Hoa nhiệt đới', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'sea-rock', src: '/game/math/island-icons/sea-rock.svg', alt: 'Tảng đá biển', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'cave', src: '/game/math/island-icons/cave.svg', alt: 'Hang đá', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'volcano', src: '/game/math/island-icons/volcano.svg', alt: 'Núi lửa', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'waterfall', src: '/game/math/island-icons/waterfall.svg', alt: 'Thác nước nhỏ', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: false },
  { id: 'sand-castle', src: '/game/math/island-icons/sand-castle.svg', alt: 'Lâu đài cát', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
]

/** One-based order within a grade; cycles safely after lesson 50. */
export function getMathIslandLandmark(lessonOrder: number): IslandLandmarkConfig {
  const index = Number.isFinite(lessonOrder) ? Math.max(0, Math.trunc(lessonOrder) - 1) : 0
  return MATH_ISLAND_LANDMARKS[index % MATH_ISLAND_LANDMARKS.length]
}
