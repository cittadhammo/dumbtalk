import { signalService } from './signal';
import { telegramService } from './telegram';
import type { MessagingService, ServiceId } from './contracts';

const services: MessagingService[] = [signalService, telegramService];

export function installedServices(): MessagingService[] {
	return services;
}

export function serviceById(id: ServiceId): MessagingService {
	const service = services.find((candidate) => candidate.id === id);
	if (!service) throw new Error(`Unknown messaging service: ${id}`);
	return service;
}
