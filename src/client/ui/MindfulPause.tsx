type Props = { reason: string; onContinue: () => void; onExit: () => void };

export function MindfulPause({ reason, onContinue, onExit }: Props) {
	return <section class="mindful-pause" role="dialog" aria-modal="true"><div><span class="mindful-icon">◷</span><h2>A quick pause</h2><p>{reason}</p><p class="hint">Continue to keep this visit, or exit to remove it from today's tally.</p><button class="action primary focusable" onClick={onContinue}>Continue</button><button class="action focusable" onClick={onExit}>Exit</button></div></section>;
}
