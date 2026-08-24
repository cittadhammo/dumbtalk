import { useEffect } from 'preact/hooks';
import { setSoftkeys } from './Softkeys';
import { Shell } from './Shell';

type Props = { archivedCount: number; onArchived: () => void; onBack: () => void };

export function MainMenu({ archivedCount, onArchived, onBack }: Props) {
	useEffect(() => setSoftkeys({ center: 'Select', right: 'Back' }), []);
	return <Shell title="Menu"><div class="menu-list">
		<p class="menu-heading">Conversations</p>
		<button class="action menu-action focusable" onClick={onArchived}><span class="menu-icon">▣</span><span>Archived chats</span><span class="menu-value">{archivedCount}</span></button>
		<button class="action menu-action focusable" onClick={onBack}><span class="menu-icon">‹</span><span>Back to chats</span></button>
	</div></Shell>;
}
