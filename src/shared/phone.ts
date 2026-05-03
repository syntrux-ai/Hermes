export const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, '').trim();
