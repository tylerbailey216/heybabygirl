# Hey Baby Girl · Blackout Date

A first playable 3D browser demo. An apartment party fades into a nightmare after the heroine accepts a drink. Built with Three.js and Vite with cel-shaded placeholder geometry.

## Run locally

See [HANDOFF.md](HANDOFF.md) for local development, Blender asset generation, and
milestone synchronization notes.

Use Node.js 20.19+, 22.12+, or a supported newer release, and a browser with WebGL 2.

On the audio workstation, Node is also installed locally in `.local-node`. From this folder, start the game with `PATH="$PWD/.local-node/bin:$PATH" npm run dev`, open the printed local address, and press Ctrl+C to stop the server. The runtime and dependencies are not committed.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. Use `npm run dev -- --host 0.0.0.0` to try the demo in Safari on an iPhone on the same local network. Open the network URL Vite prints on the phone.

```sh
npm run build
npm run preview
```

## Controls

### After Midnight

Finish a Story escape to unlock arcade mode on this browser. After Midnight skips
the party and starts at waking. Read the clue, search the indicated furniture
(stand still for three seconds), then use the pin at the balcony and reach the
street exit. The door opens nine seconds after movement returns. Moving the table
buys seven more seconds; hiding lets the shadow patrol away. One capture ends an
arcade attempt. Returning to the apartment is also a loss.

There are nine setups: three pin locations crossed with the three existing
shadows. **Retry this setup** preserves both; **New run** changes at least one.
First encounters retain the shadow reveal; discovered shadows use a short sound
cue on subsequent arcade attempts. Unlocks, discoveries and bests are saved to
local browser storage, with an in-session fallback when storage is unavailable.

The timer covers controllable apartment/fire-escape play, excluding waking and
the reveal. Score = 10,000 minus 40 per second, plus 250 per close escape (up to
three bonuses), with a minimum of zero. A close escape means getting within 1.5
units of the shadow and then hiding or increasing the gap beyond 2.2 units.
Best score and fastest time are recorded separately for each setup. This is a
sprint prototype; the intended two-to-three-minute pacing still needs playtesting
and expansion beyond the current single-room route.

### Story

Select **Start demo** to begin the party and enable sound in your browser. Use the **Mute** button or **M** to toggle sound.

Tap a dialogue response or press **1** or **2**. Each prompt has one response that advances the story. A wrong answer in the apartment changes the current run, even if you retry the blackout. A wrong answer at street level sends you back to that street prompt.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Advance dialogue | Enter, Space or E | Tap the response |
| Move | WASD or arrow keys | Drag the thumbstick in any direction |
| Interact | E | Tap the active Table, Hide, Inspect, or Latch button |
| Restart | R | Tap Restart |
| Toggle phone flashlight | F | Tap Phone light |

The heroine visibly holds her phone while exploring the blackout, fire escape,
and controllable street scenes. Its blue spill and directional beam follow her
movement. Turning it off is allowed and leaves movement/interactions available;
the HUD warns that darkness hides the route. Each fresh run starts with it on.
Street dressing includes the editable Blender kit at `art/street/street-kit.blend`,
with beveled civilian street props, shuttered storefronts, masonry and lit windows.
Wet asphalt, puddles, drains, paving and warm intersection lighting complete the
nighttime palette. Regenerate the kit using Blender and `tools/build_street.py`.

After the drink sequence, shake the thumbstick left and right or alternate A and D to fill the wake meter. Once the heroine can move, get the release pin and head for the balcony. A barricade can still delay an entry while the door is closed. Interact near the hanging coats to hide or emerge. Find the balcony release pin in the sideboard. Use the pin at the balcony and stay still until the latch opens. Cross the fire escape, step onto the street, and choose whether to check the phone. The ending cutscene leads to a restart screen. If the phone trap catches you, retry the street, shake awake within seven seconds after the light goes out, then run right to the lit intersection. If caught, **Retry blackout** starts a fresh escape attempt. After escaping, **Play again** returns to the date.

## Verification

The return-to-apartment cinematic uses accelerated, staggered lunges, fog, pulsing
crimson light and darkness, camera shake/roll, and impact blur. Reduced-motion
preferences disable the shaking and pulses. The nightmare browser check captures
its approach/contact and verifies reduced motion and a clean fire-escape retry.

Run `npm test` for the simulation/storage checks. Run `npm run test:browser` for
headless desktop/mobile browser checks (Edge on Windows; installed Playwright
Chromium on other platforms). The browser checks also save screenshots under
`test-results/`. They do not replace listening checks or physical iPhone testing.

The apartment uses the supplied **Corrupted Sector 7.mp3**, included under
`src/assets/audio/`. It loops through the shared mute/master mix; the synthesized
overworld theme remains outside. Listening lowers the apartment track; taking a
sip switches to a pre-rendered reverse through the nightmare until the fire escape.
The supplied Mixkit light rain loop plays on the fire escape, during descent,
and throughout the street sections. Street scenes use rain in place of the
synthesized background music; footsteps and encounter sounds remain active.
The party NPCs use a separate civilian character
builder inspired by the supplied FedUP references. Heroine and shadow art remain
separate and unchanged.

The production build and simulation/storage checks pass. Earlier simulation coverage includes barricade delay, hiding through entry, escape, capture, and state reset. Headless Edge checks cover desktop rendering, apartment track playback, and portrait/landscape arcade results and retries. Physical iPhone input and subjective sound balance still need playtesting.

## GitHub Pages

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
The deployment workflow builds and publishes `dist/` on pushes to `main`.
The build uses relative asset URLs so it works at the repository's Pages path.
