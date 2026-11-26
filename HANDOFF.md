# Local build handoff

## Working agreement

Continue development in `D:\HBG\heybabygirl`. Commit and push each important,
verified milestone to `origin/main`; pushes also trigger the GitHub Pages workflow.
Keep Blender sources and exported game assets in the same milestone commit.

## Direction

Move the apartment, fire escape, and street toward psychological horror through
believable materials, deliberate light, environmental storytelling, and restrained
sound. Preserve readable navigation and the existing keyboard/touch controls.

## Dialogue and balcony audio pass

- Stay quiet and listen reduces the apartment music gain from .26 to .12;
  Crank the music back up restores it.
- Take a sip crossfades from Corrupted Sector 7 into its pre-rendered reverse.
  Reverse playback continues through waking/blackout and ends at the fire escape.
  Nightmare retries and arcade waking start the reversed track from the beginning.
- `src/assets/audio/light-rain-loop.wav` is the supplied Mixkit 2393 recording,
  used for fireEscape and descent. Synthesized rain remains on the street and is
  the fallback if the recording cannot play. All tracks share master/mute.
- Reversed asset generation: `ffmpeg -i src/assets/audio/corrupted-sector-7.mp3
  -af areverse -codec:a libmp3lame -q:a 3
  src/assets/audio/corrupted-sector-7-reversed.mp3` (one command).
- Production build, eight simulation tests, and the story/audio browser tests
  pass. Browser tests inspect real Web Audio gains and media playback across
  dialogue, sip, waking, fireEscape, descent, and return to party.

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

### After Midnight prototype

Arcade unlocks after a completed Story escape and persists on the current origin.
Nine deterministic setups pair three clue-backed pin spots with three shadows.
Retries retain the setup; new runs change it. Arcade finishes at the street exit
without the authored street dialogue/cinematics. One capture or returning inside
ends a run. Results use the existing 1980s ending art; failures use the existing
breach art. No new heroine or shadow artwork was generated.

Run scoring, first-time reveals, storage fallback, and every pin-to-balcony route
are covered by `npm test`. `npm run test:browser` exercises the mobile interface and
apartment soundtrack. The short apartment currently plays as a sprint: the
two-to-three-minute target needs additional pacing/content work and phone playtests.

The user-supplied apartment track is in `src/assets/audio/`. It replaces the
synthesized music indoors; the newer overworld theme is preserved outdoors.
Partygoers now have a dedicated rounded civilian model builder. Keep the heroine,
partygoers, date character, and shadow entities' visual identities independent.

Validation: production build, eight simulation/storage tests, and headless Edge
desktop/mobile browser flows passed. Browser checks confirm apartment music
playback, mute UI, unlock persistence, loss results, retry and new-run behavior.
Captures are under ignored `test-results/`; physical iPhone input and subjective
audio balance still need human playtesting. CI now runs simulation tests before
building and deploying Pages.

### Earlier atmosphere pass

Validation for this pass: JavaScript syntax checks, GLB structure checks, and the
Vite production build passed. The build reports a JavaScript chunk over 500 kB.
Browser control was unavailable, so visual, listening, and physical phone checks
remain pending. The initial dependency install was slow; the build was verified
with `node node_modules/vite/bin/vite.js build` once the required packages arrived.

Review the apartment in party, waking, blackout, and return-nightmare states on
desktop and phone. Check sound balance with headphones and speakers, mute/restart,
and reduced motion. Continue with worn architectural detail, stronger focal props,
and environmental storytelling before extending the style outdoors.
