import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { installedServices, serviceById } from './registry';
import type { MessagingService, ServiceId, ServiceStatus } from './contracts';

type ContextValue = {
	services: MessagingService[];
	statuses: ServiceStatus[];
	refreshStatuses: () => Promise<void>;
	serviceFor: (id: ServiceId) => MessagingService;
};

const ServiceContext = createContext<ContextValue | null>(null);

export function MessagingServiceProvider({ children }: { children: ComponentChildren }) {
	const services = useMemo(() => installedServices(), []);
	const [statuses, setStatuses] = useState<ServiceStatus[]>([]);

	const refreshStatuses = async () => {
		const next = await Promise.all(services.map((service) => service.getStatus()));
		setStatuses(next);
	};

	useEffect(() => {
		void refreshStatuses();
	}, []);

	return (
		<ServiceContext.Provider
			value={{
				services,
				statuses,
				refreshStatuses,
				serviceFor: serviceById,
			}}
		>
			{children}
		</ServiceContext.Provider>
	);
}

export function useMessagingServices(): ContextValue {
	const context = useContext(ServiceContext);
	if (!context) throw new Error('useMessagingServices must be used inside MessagingServiceProvider');

	return context;
}
