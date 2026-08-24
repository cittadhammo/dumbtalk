# Messaging service adapters

The Preact UI uses only the universal types in `src/client/services/contracts.ts`.
It does not know whether a conversation came from Signal, Telegram, or another
network.

Each network has one adapter file, such as `services/signal.ts`. An adapter:

- maps its backend payload into universal conversations, messages, attachments,
  reactions, receipts, and typing state;
- implements universal operations such as listing conversations, loading
  messages, marking a conversation read, and sending text; and
- retains its network-specific target identifiers internally.

`services/registry.ts` lists the installed adapters. The UI asks the registry
for all services, merges their conversation pages, and labels each row with the
source service. Adding Telegram later means adding a Telegram backend and one
adapter, not copying the conversation list or chat UI.

Service setup belongs in the Services screen. Signal is shown there now as the
first connected service; future services will use the same status and setup
surface.
