import { randomUUID } from 'expo-crypto';

/** Client-generated record IDs make every create retry-safe (architecture.md §5.1). */
export const newId = (): string => randomUUID();
