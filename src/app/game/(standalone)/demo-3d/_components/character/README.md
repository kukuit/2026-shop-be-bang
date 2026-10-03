# Demo 3D character setup

`PlayerController` owns the Rapier root, collider, movement, jump and portal checks. `CharacterRenderer` is a visual child, so movement and collision do not inspect model meshes or bones. The active character and skin are selected through `character/slots.ts`.

## Add a rigged character

1. Put the optimized `.glb` under `public/games/3d/characters/` or regenerate Cappy with `npm run generate:cappy-model`.
2. Add a `CharacterDefinition` with `modelUrl`, dimensions, collider, camera values, standard bone-name mapping, attachment node names and the required clip names.
3. Register the definition and a default skin in `characters/registry.ts` and `slots.ts`.
4. Point the player slot at the new character. The movement root and camera continue to use the same interface.

Models are cloned, normalized to the configured gameplay height, and grounded at the visual root. Clip names map to `idle`, `walk`, `run`, `jumpStart`, `jumpLoop`, and `jumpLand`; mapped actions crossfade over 0.2 seconds. `materialOverrides` or semantic skin colors update GLB materials. The generated Cappy GLB includes named `HeadAttachment`, `BackAttachment`, `LeftHandAttachment` and `RightHandAttachment` joints for later accessory models.

## Current asset status

Cappy's current GLB uses a bright orange capybara design with an oversized head, glossy eyes, cheeks, open smile and a small fur tuft, matching the supplied mascot reference. Smooth stylized meshes attach to the named rig, with one weighted torso mesh. The GLB includes an idle wave, walk, run and three jump clips. The old primitive proxy remains only as a fallback. Skins can recolor the model; rendering separate accessory models still needs an accessory asset registry/renderer.
