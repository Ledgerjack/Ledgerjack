export type {
  DBAccount as Account,
  DBTransaction as Transaction,
  DBSplit as Split,
  DBAttachment as EncryptedAttachment,
  DBMileageLog as MileageLog,
  DBSettings as Settings,
  DBCryptoEnvelope as EncryptedCryptoEnvelope,
  TransactionWithSplits,
} from './lib/db';

/** Canonical account type values (uppercase per GnuCash convention) */
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type AppView =
  | 'dashboard'
  | 'transaction-entry'
  | 'pending-review'
  | 'reports'
  | 'file-cabinet'
  | 'mileage-logger'
  | 'settings';

/**
 * Persisted Key-Encrypting-Key envelope.
 * Allows password rotation without re-encrypting all data.
 */
export interface MDKEnvelope {
  /** PBKDF2 salt as base64 */
  salt: string;
  /** AES-GCM nonce used to wrap the MDK, as base64 */
  iv: string;
  /** KEK-wrapped MDK ciphertext as base64 */
  encryptedMDK: string;
}

export interface EnvironmentReport {
  cryptoSecureContext: boolean;
  indexedDbSupported: boolean;
  webAuthnAvailable: boolean;
  persistenceGranted: boolean;
  systemOperational: boolean;
}
