# Local build handoff

## Working agreement

Continue development in `D:\HBG\heybabygirl`. Commit and push each important,
verified milestone to `origin/main`; pushes also trigger the GitHub Pages workflow.
Keep Blender sources and exported game assets in the same milestone commit.

## Direction

Move the apartment, fire escape, and street toward psychological horror through
believable materials, deliberate light, environmental storytelling, and restrained
sound. Preserve readable navigation and the existing keyboard/touch controls.

## Apartment atmosphere pass

- `art/apartment/floor-lamp.blend`: editable Blender floor lamp.
- `src/assets/models/floor-lamp.glb`: runtime asset, loaded with GLTFLoader.
- `tools/build_apartment_props.py`: reproducible source and export generation.
- Filmic tone mapping, a warm practical lamp that cools after blackout, slow light
  instability (steady with reduced motion), and moonlit floor stripes.
- Low room tone, alternating stereo creaks, apartment/street footsteps, and
  proximity-based heartbeat. Existing sound controls govern all new audio.

To regenerate the prop:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_apartment_props.py
```

Use `npm.cmd` in PowerShell because this machine blocks `npm.ps1`.
Run `npm.cmd ci`, `npm.cmd run build`, then `npm.cmd run dev`.
Dependency downloads may require network permission. `.npm-cache/` is ignored.

## Next passes

Validation for this pass: JavaScript syntax checks, GLB structure checks, and the
Vite production build passed. The build reports a JavaScript chunk over 500 kB.
Browser control was unavailable, so visual, listening, and physical phone checks
remain pending. The initial dependency install was slow; the build was verified
with `node node_modules/vite/bin/vite.js build` once the required packages arrived.

Review the apartment in party, waking, blackout, and return-nightmare states on
desktop and phone. Check sound balance with headphones and speakers, mute/restart,
and reduced motion. Continue with worn architectural detail, stronger focal props,
and environmental storytelling before extending the style outdoors.
