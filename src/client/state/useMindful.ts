import { useEffect, useMemo, useState } from 'preact/hooks';
import { api } from '../api/client';

type Usage = { day: string; checks: number; activeMs: number; launches: number[]; nudges: Record<string, boolean>; lastLaunch: number };
const GAP = 20_000;
const WINDOW = 45 * 60_000;

function day() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); }
function empty(): Usage { return { day: day(), checks: 0, activeMs: 0, launches: [], nudges: {}, lastLaunch: 0 }; }

export function useMindful(enabled: boolean) {
	const [usage, setUsage] = useState<Usage>();
	const [pause, setPause] = useState<string>();
	useEffect(() => {
		if (!enabled) return;
		let active = true;
		void api<{ usage?: Usage }>(`/api/mindful?day=${day()}`).then((result) => {
			if (!active) return;
			const next = result.usage ?? empty();
			const now = Date.now();
			if (!next.lastLaunch || now - next.lastLaunch >= GAP) {
				next.checks += 1;
				next.launches = [...next.launches, now].filter((stamp) => now - stamp < 24 * 60 * 60_000);
				next.lastLaunch = now;
				if (next.launches.filter((stamp) => now - stamp <= WINDOW).length >= 2 && !next.nudges.burst) {
					next.nudges = { ...next.nudges, burst: true };
					setPause(`This is your second check in 45 minutes.`);
				} else if ([4, 6, 9].includes(next.checks) && !next.nudges[`checks-${next.checks}`]) {
					next.nudges = { ...next.nudges, [`checks-${next.checks}`]: true };
					setPause(`This is check ${next.checks} today.`);
				}
			}
			setUsage(next);
			void api('/api/mindful', { method: 'POST', body: JSON.stringify({ day: next.day, usage: next }) });
		});
		return () => { active = false; };
	}, [enabled]);
	const label = useMemo(() => usage ? `${usage.checks} check${usage.checks === 1 ? '' : 's'} · ${Math.floor(usage.activeMs / 60_000)}m` : '', [usage]);
	function continuePause() { setPause(undefined); }
	async function exitPause() {
		if (!usage) return;
		const next = { ...usage, checks: Math.max(0, usage.checks - 1), launches: usage.launches.slice(0, -1), lastLaunch: usage.launches.at(-2) ?? 0 };
		setUsage(next); setPause(undefined);
		await api('/api/mindful', { method: 'POST', body: JSON.stringify({ day: next.day, usage: next }) }).catch(() => {});
		if (history.length > 1) history.back(); else window.close();
	}
	return { usageLabel: label, pause, continuePause, exitPause };
}
