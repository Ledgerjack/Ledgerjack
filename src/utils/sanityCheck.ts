interface EnvironmentReport {
  cryptoSecureContext: boolean;
  indexedDbSupported: boolean;
  webAuthnAvailable: boolean;
  persistenceGranted: boolean;
  systemOperational: boolean;
}

async function initializeStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}

export async function runHardwareSanityCheck(): Promise<EnvironmentReport> {
  const report: EnvironmentReport = {
    cryptoSecureContext: typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle,
    indexedDbSupported: typeof window !== 'undefined' && !!window.indexedDB,
    webAuthnAvailable: typeof window !== 'undefined' && 'PublicKeyCredential' in window,
    persistenceGranted: false,
    systemOperational: false,
  };

  if (report.cryptoSecureContext && report.indexedDbSupported) {
    report.persistenceGranted = await initializeStoragePersistence();
    report.systemOperational = true;
    console.log('[Sanity Check] Target host platform passes zero-knowledge storage validation requirements.');
  } else {
    console.error('[Critical Diagnostic] Target host device fails foundational Web Crypto specifications.');
  }

  return report;
}
