import { useCallback, useEffect, useState } from 'preact/hooks';
import { api, hasWidgetToken, ApiError } from '../api/client';
import { LinkScreen } from './LinkScreen';
import { Shell } from './Shell';
import { StartupScreen } from './StartupScreen';
import { ChatRoom } from './ChatRoom';
import { ConversationList } from './ConversationList';
import { Softkeys } from './Softkeys';
import { MainMenu } from './MainMenu';
import type { Conversation } from '../state/types';
import { useMindful } from '../state/useMindful';
import { MindfulPause } from './MindfulPause';

type Status = { signalReady: boolean; linked: boolean };

export function App() {
	const [status, setStatus] = useState<Status>();
	const [error, setError] = useState<string>();
	const [conversation, setConversation] = useState<Conversation>();
	const [menu, setMenu] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [archivedCount, setArchivedCount] = useState(0);
	const mindful = useMindful(Boolean(status?.linked));
	const boot = useCallback(() => {
		if (!hasWidgetToken()) {
			setError('This widget is not configured.');
			return;
		}
		setError(undefined);
		setStatus(undefined);
		void api<Status>('/api/status')
			.then(setStatus)
			.catch((reason: unknown) => {
				const error = reason as ApiError;
				setError(error.status === 404 ? 'This widget is not configured.' : error.message);
			});
	}, []);

	useEffect(() => boot(), [boot]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.code === 'ShiftLeft' || event.key === 'SoftLeft') {
				event.preventDefault();
				if (!conversation) setMenu(true);
				return;
			}
			if (event.code === 'ShiftRight' || event.key === 'SoftRight' || event.key === 'Escape') {
				event.preventDefault();
				if (conversation) setConversation(undefined);
				else if (menu) setMenu(false);
				else if (showArchived) setShowArchived(false);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [conversation, menu, showArchived]);
	const content = error ? <StartupScreen message={error} error onRetry={boot} />
		: !status ? <StartupScreen message="Starting SigDumb…" />
		: !status.signalReady ? <StartupScreen message="Starting Signal…" />
		: !status.linked ? <LinkScreen onLinked={boot} />
		: menu ? <MainMenu archivedCount={archivedCount} onArchived={() => { setMenu(false); setShowArchived(true); }} onBack={() => setMenu(false)} />
		: conversation ? <ChatRoom conversation={conversation} usage={mindful.usageLabel} onBack={() => setConversation(undefined)} />
		: <ConversationList usage={mindful.usageLabel} showArchived={showArchived} onOpen={setConversation} onMenu={() => setMenu(true)} onLoaded={(next) => setArchivedCount(next.archivedCount)} />;
	return <><div class="client-root">{content}</div><Softkeys />{mindful.pause && <MindfulPause reason={mindful.pause} onContinue={mindful.continuePause} onExit={mindful.exitPause} />}</>;
}
