'use client'

import OceanFish from './OceanFish'
import OceanProps from './OceanProps'
import OceanTerrain from './OceanTerrain'
import OceanTreasure from './OceanTreasure'
import { getOceanFloorHeight } from './ocean-layout'
import type { OceanMissionRound } from './ocean-mission'
import { OCEAN_GOLDEN_CHEST_POSITION, type OceanNearbyAction } from './OceanPlayer'

export default function OceanEnvironment({ round, openedChestId, goldenChestFound, goldenChestOpening, collectedIds, nearbyAction }: {
  round: OceanMissionRound
  openedChestId: string | null
  goldenChestFound: boolean
  goldenChestOpening: boolean
  collectedIds: ReadonlySet<string>
  nearbyAction: OceanNearbyAction
}) {
  return <>
    <OceanTerrain />
    <OceanProps collectedIds={collectedIds} />
    <OceanFish />
    {round.chests.map((chest) => <OceanTreasure key={chest.id} number={chest.number} position={[chest.position[0], getOceanFloorHeight(chest.position[0], chest.position[2]), chest.position[2]]} open={openedChestId === chest.id} active={nearbyAction?.id === chest.id} />)}
    {!goldenChestFound && <OceanTreasure golden position={[OCEAN_GOLDEN_CHEST_POSITION[0], getOceanFloorHeight(OCEAN_GOLDEN_CHEST_POSITION[0], OCEAN_GOLDEN_CHEST_POSITION[2]), OCEAN_GOLDEN_CHEST_POSITION[2]]} open={goldenChestOpening} active={nearbyAction?.id === 'golden-chest'} />}
  </>
}
