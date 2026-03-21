// Limuru Cottage Hospital Queue Management System - Shared Types
// This package is used by all apps (API, Web, Mobile)

export * from './types/index';
export { HMSAdapter, HMSConfig, HMS_ADAPTER_TYPES, createHMSAdapter, MockHMSAdapter, OpenMRSHMSAdapter, BahmniHMSAdapter, OpenELISHMSAdapter, validateHMSConfig } from './hms-adapters/index';
export type { HMSAdapterType, HMSSyncStatus } from './hms-adapters/index';
