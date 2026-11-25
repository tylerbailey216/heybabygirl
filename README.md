# Hey Baby Girl · Blackout Date

A first playable 3D browser demo. A dinner date turns into a supernatural apartment escape when the power drops. Built with Three.js and Vite with cel-shaded placeholder geometry.

## Run locally

Use Node.js 20.19+, 22.12+, or a supported newer release, and a browser with WebGL 2.

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

| Action | Keyboard | Touch |
| --- | --- | --- |
| Advance dialogue | Enter, Space or E | Tap the response |
| Move | WASD or arrow keys | Drag the thumbstick in any direction |
| Interact | E | Tap the active Table, Hide, Inspect, or Latch button |
| Restart | R | Tap Restart |

After the blackout, approach the table, grab it, and move toward the entry to delay the pursuer. Interact near the hanging coats to hide or emerge. Find the balcony release pin in the sideboard. Searching the drawer or checking the deadbolt starts the entry countdown. Use the pin at the balcony and stay still until the latch opens. Cross the fire escape, step onto the street, and check the phone. The ending cutscene leads to a restart screen. If caught, **Retry blackout** starts a fresh escape attempt. After escaping, **Play again** returns to the date.

## Verification

The production build passes. The game simulation was exercised for the barricade delay, hiding through entry, successful escape, capture, and a fresh escape after state reset. Browser rendering and physical iPhone input still need a smoke test.

## GitHub Pages

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
The deployment workflow builds and publishes `dist/` on pushes to `main`.
The build uses relative asset URLs so it works at the repository's Pages path.
