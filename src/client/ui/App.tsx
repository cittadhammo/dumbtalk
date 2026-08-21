/**
 * The migration shell deliberately has no legacy DOM mutation code. Screens are
 * introduced here only when their Preact equivalent has full parity coverage.
 */
export function App() {
  return <section class="migration-shell" aria-live="polite">Preparing SigDumb…</section>;
}
