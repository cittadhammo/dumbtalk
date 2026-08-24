# SigDumb frontend refactor

This branch replaces the monolithic browser script with a Preact + TypeScript + Vite client. The
server remains `server.mjs` and its routes, payloads, authentication, media handling, persistence,
and Signal integration are unchanged. The current `public/` client remains the compatibility
fallback until the new client passes the feature and CloudPhone keyboard checks.

## Framework and boundaries

- Preact 10 with function components and hooks; no router or state framework is needed.
- Vite with `@preact/preset-vite`; TypeScript in strict mode for component/API contracts.
- Sass modules/partials for the existing CSS. The visual tokens, compact QVGA/WVGA layout, and
  focus styles are migrated without redesigning them.
- A single `ApiClient` owns widget-token headers, JSON errors, same-origin requests, and protected
  media blob URLs. Components never call `fetch` directly.
- A small `AppStore` hook owns navigation, selected conversation/message, drafts, refresh epochs,
  mindful usage, and focus/scroll restoration. Server data remains authoritative.

## Component map

`App` boots the widget and chooses `StartupScreen`, `LinkScreen`, or `ConversationList`.

- `AppShell`: header/branding, usage tally, soft-key legend, and page focus boundary.
- `StartupScreen`: configured/error/loading states and retry.
- `LinkScreen`: QR rendering, link finish, QVGA-safe layout, and soft-key actions.
- `ConversationList` / `ConversationRow`: active and archived lists, avatars, previews, unread
  badges, typing previews, Note to Self, refresh-safe selected-row focus.
- `MainMenu`, `ComposeScreen`, `SearchScreen`, `SettingsScreen`, `NewGroupScreen`.
- `ChatRoom`: message timeline, unread marker, typing dots, drafts, compose, refresh reconciliation,
  bottom/read boundary, and keyboard navigation.
- `MessageBubble`: sender/quote/mentions, text styles, attachments, reactions, receipts, polls,
  disappearing-message system entries, and selected-message context actions.
- `MessageActions`, `ReactionPicker`, `ReceiptDetails`, `PinnedMessages`, `ChatOptions`.
- `ImageViewer` / `VideoViewer`: protected media loading, image gallery left/right navigation,
  Fit/Zoom, vertical zoom scrolling, and preserved return focus.
- `VoiceRecorder`, `PollComposer`, `PollVote`, `SafetyNumber`, `GroupSettings`.
- `MindfulPause`: Continue keeps the counted launch; Exit rolls it back and exits the widget.

## Existing API contract

All `/api/*` calls use `Authorization: Bearer <hash token>` from the URL fragment. Static files
remain public. GETs include status and cache-safe media; mutating calls preserve the existing
same-origin protection.

- Boot/auth: `GET /api/status`, `POST /api/link/start`, `POST /api/link/finish`.
- Usage: `GET/POST /api/mindful`.
- Lists/history: `GET /api/conversations`, `GET /api/messages/:conversationId?before=...`.
- Read/typing: `POST /api/read`, `POST /api/typing`.
- Messaging: `POST /api/send`, `/api/voice`, `/api/message/edit`, `/api/message/delete`,
  `/api/message/reaction`, `/api/message/pin`.
- Media: authenticated blob requests for `/api/attachment`, `/api/avatar`, `/api/sticker`, and
  view-once media; never put bearer credentials in native media element URLs.
- Chat features: archive/favourite, search, settings, polls, pins, identity, groups, and
  disappearing-message settings retain their current payloads and error handling.

## Behaviour that must not regress

- D-pad arrows move through focusable controls; left soft key opens menus; right soft key backs out;
  centre/Enter selects. Emoji grids support two-dimensional movement and edge escape.
- Refreshes merge messages by stable id, preserve the focused message, selection/cursor, viewport
  anchor, and whether the user is following the bottom. Images loading must not force a compose focus.
- Opening a room positions at the first unread message. Read state comes from the server's
  `readThrough`; the client marks read only when the user reaches the bottom.
- QVGA/WVGA fit, compact chrome, protected media, gallery navigation, image Fit/Zoom, video/audio,
  message actions, receipts/reactions, and all current mindful friction remain visually equivalent.

## Migration and verification order

1. Establish build output in an isolated `public-next/` directory and type-safe API/store helpers.
2. Migrate shell, startup/linking, mindful usage, softkeys, and list/room read-refresh behaviour.
3. Migrate message rendering/actions and media viewers, then the remaining feature screens.
4. Run TypeScript, Vite production build, existing server tests, and browser keyboard/viewport smoke
   checks. Only after parity is demonstrated should the production static entry be switched.
