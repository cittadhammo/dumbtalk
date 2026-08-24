import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { Shell } from './Shell';

type Props = { onLinked: () => void };
type LinkStart = { uri: string; qr: string };

export function LinkScreen({ onLinked }: Props) {
	const [qr, setQr] = useState<string>();
	const [uri, setUri] = useState('');
	const [message, setMessage] = useState('Preparing link…');

	useEffect(() => {
		void api<LinkStart>('/api/link/start')
			.then(async (result) => {
				setUri(result.uri);
				setQr(result.qr || (await QRCode.toDataURL(result.uri, { margin: 1, width: 240 })));
				setMessage('Scan this code from Signal → Settings → Linked devices.');
			})
			.catch((error: Error) => setMessage(error.message));
	}, []);

	async function finish() {
		setMessage('Waiting for Signal…');
		try {
			await api('/api/link/finish', { method: 'POST', body: JSON.stringify({ uri }) });
			onLinked();
		} catch (error) {
			setMessage((error as Error).message);
		}
	}

	return (
		<Shell title="Link Signal" className="linking">
			<h2>Link SigDumb</h2>
			{qr ? <img class="qr" src={qr} alt="Signal linking QR code" /> : <p>Loading QR…</p>}
			<p id="link-status">{message}</p>
			<button class="action primary focusable" onClick={finish} disabled={!uri}>
				Finish linking
			</button>
		</Shell>
	);
}
