# Messaging service adapters

The Preact UI uses only the universal types in `src/client/services/contracts.ts`.
It does not know whether a conversation came from Signal, Telegram, or another
network.

Each network has one adapter file, such as `services/signal.ts` or
`services/telegram.ts`. An adapter:

- maps its backend payload into universal conversations, messages, attachments,
  reactions, receipts, and typing state;
- implements universal operations such as listing conversations, loading
  messages, marking a conversation read, and sending text; and
- retains its network-specific target identifiers internally.

`services/registry.ts` lists the installed adapters. The service provider exposes
only connected adapters to messaging screens, merges their conversation pages,
and labels each row with its source service. The Services screen still sees every
installed adapter so disconnected accounts can be configured.

Service setup belongs in the Services screen. Signal and Telegram use the same
setup contract even though Signal has a single QR flow and Telegram offers QR or
phone/code/password flows. Service-specific backend routes are namespaced under
`/api/services/<service>`.

Same-service forwarding uses the network’s native forwarding operation.
Cross-service forwarding downloads the authenticated source media in the client
and uploads it through the target adapter with an explicit attribution line.
