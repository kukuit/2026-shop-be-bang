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
  { id: 'crab', src: '/games/general/images/map-island-icons/crab.svg', alt: 'Cua biển', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'shrimp', src: '/games/general/images/map-island-icons/shrimp.svg', alt: 'Tôm', category: 'sea-life', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'squid', src: '/games/general/images/map-island-icons/squid.svg', alt: 'Mực', category: 'sea-life', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'octopus', src: '/games/general/images/map-island-icons/octopus.svg', alt: 'Bạch tuộc', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'starfish', src: '/games/general/images/map-island-icons/starfish.svg', alt: 'Sao biển', category: 'sea-life', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'seashell', src: '/games/general/images/map-island-icons/seashell.svg', alt: 'Vỏ sò', category: 'sea-life', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'sea-snail', src: '/games/general/images/map-island-icons/sea-snail.svg', alt: 'Ốc biển', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lobster', src: '/games/general/images/map-island-icons/lobster.svg', alt: 'Tôm hùm', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'tropical-fish', src: '/games/general/images/map-island-icons/tropical-fish.svg', alt: 'Cá nhiệt đới', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pufferfish', src: '/games/general/images/map-island-icons/pufferfish.svg', alt: 'Cá nóc', category: 'sea-life', position: 'front-right', scale: 1, checkpoint: true },
  { id: 'jumping-fish', src: '/games/general/images/map-island-icons/jumping-fish.svg', alt: 'Cá nhảy khỏi mặt nước', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'shark-fin', src: '/games/general/images/map-island-icons/shark-fin.svg', alt: 'Vây cá mập', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'dolphin', src: '/games/general/images/map-island-icons/dolphin.svg', alt: 'Cá heo', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'whale-tail', src: '/games/general/images/map-island-icons/whale-tail.svg', alt: 'Đuôi cá voi', category: 'ocean', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'sea-turtle', src: '/games/general/images/map-island-icons/sea-turtle.svg', alt: 'Rùa biển', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'jellyfish', src: '/games/general/images/map-island-icons/jellyfish.svg', alt: 'Sứa', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'red-coral', src: '/games/general/images/map-island-icons/red-coral.svg', alt: 'San hô đỏ', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'branch-coral', src: '/games/general/images/map-island-icons/branch-coral.svg', alt: 'San hô dạng nhánh', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pearl-shell', src: '/games/general/images/map-island-icons/pearl-shell.svg', alt: 'Trai ngọc', category: 'ocean', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'pearl', src: '/games/general/images/map-island-icons/pearl.svg', alt: 'Ngọc trai lớn', category: 'ocean', position: 'front-right', scale: 0.85, checkpoint: true },
  { id: 'anchor', src: '/games/general/images/map-island-icons/anchor.svg', alt: 'Mỏ neo', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lifebuoy', src: '/games/general/images/map-island-icons/lifebuoy.svg', alt: 'Phao cứu sinh', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'wooden-boat', src: '/games/general/images/map-island-icons/wooden-boat.svg', alt: 'Thuyền gỗ nhỏ', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'sailboat', src: '/games/general/images/map-island-icons/sailboat.svg', alt: 'Thuyền buồm', category: 'voyage', position: 'back-right', scale: 1.1, checkpoint: false },
  { id: 'speedboat', src: '/games/general/images/map-island-icons/speedboat.svg', alt: 'Cano', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'ship', src: '/games/general/images/map-island-icons/ship.svg', alt: 'Tàu biển', category: 'voyage', position: 'water-right', scale: 1, checkpoint: false },
  { id: 'pirate-flag', src: '/games/general/images/map-island-icons/pirate-flag.svg', alt: 'Cờ hải tặc', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'treasure-map', src: '/games/general/images/map-island-icons/treasure-map.svg', alt: 'Bản đồ kho báu', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'compass', src: '/games/general/images/map-island-icons/compass.svg', alt: 'La bàn', category: 'voyage', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'telescope', src: '/games/general/images/map-island-icons/telescope.svg', alt: 'Kính viễn vọng', category: 'voyage', position: 'front-right', scale: 1, checkpoint: true },
  { id: 'gold-bag', src: '/games/general/images/map-island-icons/gold-bag.svg', alt: 'Túi vàng', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'treasure-chest', src: '/games/general/images/map-island-icons/treasure-chest.svg', alt: 'Rương kho báu đóng', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'open-treasure-chest', src: '/games/general/images/map-island-icons/open-treasure-chest.svg', alt: 'Rương kho báu mở', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'gold-coins', src: '/games/general/images/map-island-icons/gold-coins.svg', alt: 'Chồng đồng vàng', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'blue-gem', src: '/games/general/images/map-island-icons/blue-gem.svg', alt: 'Đá quý xanh', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'message-bottle', src: '/games/general/images/map-island-icons/message-bottle.svg', alt: 'Chai thư', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'scroll-map', src: '/games/general/images/map-island-icons/scroll-map.svg', alt: 'Cuộn bản đồ', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'golden-key', src: '/games/general/images/map-island-icons/golden-key.svg', alt: 'Chìa khóa vàng', category: 'treasure', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'island-lantern', src: '/games/general/images/map-island-icons/island-lantern.svg', alt: 'Đèn biển', category: 'treasure', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'lighthouse', src: '/games/general/images/map-island-icons/lighthouse.svg', alt: 'Hải đăng', category: 'treasure', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'beach-hut', src: '/games/general/images/map-island-icons/beach-hut.svg', alt: 'Lều trên đảo', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'hammock', src: '/games/general/images/map-island-icons/hammock.svg', alt: 'Võng', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'coconuts', src: '/games/general/images/map-island-icons/coconuts.svg', alt: 'Trái dừa', category: 'mystery-island', position: 'front-right', scale: 0.85, checkpoint: false },
  { id: 'double-palm', src: '/games/general/images/map-island-icons/double-palm.svg', alt: 'Hai cây dừa', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'tropical-flower', src: '/games/general/images/map-island-icons/tropical-flower.svg', alt: 'Hoa nhiệt đới', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'sea-rock', src: '/games/general/images/map-island-icons/sea-rock.svg', alt: 'Tảng đá biển', category: 'mystery-island', position: 'front-right', scale: 1, checkpoint: false },
  { id: 'cave', src: '/games/general/images/map-island-icons/cave.svg', alt: 'Hang đá', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'volcano', src: '/games/general/images/map-island-icons/volcano.svg', alt: 'Núi lửa', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
  { id: 'waterfall', src: '/games/general/images/map-island-icons/waterfall.svg', alt: 'Thác nước nhỏ', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: false },
  { id: 'sand-castle', src: '/games/general/images/map-island-icons/sand-castle.svg', alt: 'Lâu đài cát', category: 'mystery-island', position: 'back-right', scale: 1.1, checkpoint: true },
]

/** One-based order within a grade; cycles safely after lesson 50. */
export function getMathIslandLandmark(lessonOrder: number): IslandLandmarkConfig {
  const index = Number.isFinite(lessonOrder) ? Math.max(0, Math.trunc(lessonOrder) - 1) : 0
  return MATH_ISLAND_LANDMARKS[index % MATH_ISLAND_LANDMARKS.length]
}
