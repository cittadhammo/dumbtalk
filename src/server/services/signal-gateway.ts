export type SignalGatewayStatus = {
	ready: boolean;
	accounts: string[];
	receive: {
		connected: boolean;
		events: number;
		messages: number;
		lastEventAt: number | null;
		lastError: string | null;
	};
	version: string;
	update: string;
	error: string | null;
	capabilities: Record<string, boolean>;
};

export interface SignalGateway {
	status(): Promise<SignalGatewayStatus>;
	startLink(): Promise<{ uri: string }>;
	finishLink(uri: string): Promise<void>;
	requestInitialSync(): Promise<void>;
}
