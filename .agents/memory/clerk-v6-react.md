---
name: Clerk v6 React API
description: Breaking changes in @clerk/react v6 vs v4 — component renames, proxyUrl handling, route requirements
---

## Key differences from Clerk v4

**Conditional rendering components renamed:**
- `<SignedIn>` → `<Show when="signed-in">`
- `<SignedOut>` → `<Show when="signed-out">`
- Import: `import { Show } from "@clerk/react"`

**publishableKey must use helper:**
```ts
import { publishableKeyFromHost } from "@clerk/react/internal";
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
```
Never use raw env var directly.

**proxyUrl must come from env var:**
```ts
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
```
Do NOT hardcode `/api/__clerk`. Empty in dev, auto-set in prod by Replit.

**Route wildcards required for OAuth callbacks:**
- Route path: `path="/sign-in/*?"` (not `/sign-in`)
- `<SignIn path>` must be full path: `path={\`${basePath}/sign-in\`}`

**Home route rule:**
- Base path (`/`) must be publicly accessible — never redirect unauthenticated users to sign-in
- Show landing page for signed-out, redirect to dashboard for signed-in

**No bearer token in browser:**
- Auth is cookie-based for web; do not call `getToken()` or add Authorization headers

**Why:**
- Clerk v6 is a major refactor released late 2024/early 2025; the `@clerk/react` package on npm is v6+ and the v4 API no longer exists.

**How to apply:**
- Any time Clerk auth is added to a React/Vite frontend, use the v6 API above.
- The server-side `@clerk/express` API is unchanged (`getAuth(req)`, `clerkMiddleware`).
