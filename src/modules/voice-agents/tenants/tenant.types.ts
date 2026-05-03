export type TenantContext = {
  organizationId: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  timezone: string;
  vertical: 'nail_salon';
  slotIntervalMinutes: number;
  sameDayBufferMinutes: number;
  voiceAgentId: string;
  providerAgentId: string;
  webhookSecret: string;
};
