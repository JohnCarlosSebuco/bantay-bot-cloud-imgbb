import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// SHA-256 hash of the valid key (original key is not stored in code for security)
// The actual key cannot be reversed from this hash
const VALID_KEY_HASH = '2c315c673dbdfca706d72952871a45fc42967ba607eb0ca209c49c90e6a3c268';

// localStorage keys
const STORAGE_KEYS = {
  VERIFIED: 'bantaybot-qr-verified',
  KEY_HASH: 'bantaybot-qr-key-hash',
  VERIFIED_AT: 'bantaybot-qr-verified-at'
};

// Hash function using Web Crypto API (SHA-256)
const hashKey = async (key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const QRSecurityContext = createContext(null);

export const useQRSecurity = () => {
  const context = useContext(QRSecurityContext);
  if (!context) {
    throw new Error('useQRSecurity must be used within a QRSecurityProvider');
  }
  return context;
};

export const QRSecurityProvider = ({ children }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const checkStoredVerification = () => {
      try {
        const storedVerified = localStorage.getItem(STORAGE_KEYS.VERIFIED);
        const storedKeyHash = localStorage.getItem(STORAGE_KEYS.KEY_HASH);
        const storedVerifiedAt = localStorage.getItem(STORAGE_KEYS.VERIFIED_AT);

        // Verify stored hash matches expected hash
        if (storedVerified === 'true' && storedKeyHash === VALID_KEY_HASH) {
          setIsVerified(true);
          setVerifiedAt(storedVerifiedAt ? new Date(storedVerifiedAt) : null);
        }
      } catch (error) {
        console.error('Error reading QR verification from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredVerification();
  }, []);

  // Extract key from scanned value (handles both URL and raw key)
  const extractKey = useCallback((scannedValue) => {
    if (!scannedValue) return null;

    // If it's a URL, try to extract the key parameter
    try {
      const url = new URL(scannedValue);
      const keyParam = url.searchParams.get('key');
      if (keyParam) return keyParam;
    } catch {
      // Not a valid URL, continue
    }

    // Return the raw value (trimmed)
    return scannedValue.trim();
  }, []);

  // Verify QR code (async because of hashing)
  const verifyQRCode = useCallback(async (scannedValue) => {
    const key = extractKey(scannedValue);
    if (!key) return false;

    try {
      // Hash the scanned key
      const keyHash = await hashKey(key);

      // Compare with valid hash
      if (keyHash === VALID_KEY_HASH) {
        const now = new Date();

        // Store in localStorage (only the hash, not the original key)
        try {
          localStorage.setItem(STORAGE_KEYS.VERIFIED, 'true');
          localStorage.setItem(STORAGE_KEYS.KEY_HASH, keyHash);
          localStorage.setItem(STORAGE_KEYS.VERIFIED_AT, now.toISOString());
        } catch (error) {
          console.error('Error storing QR verification:', error);
        }

        // Update state
        setIsVerified(true);
        setVerifiedAt(now);

        return true;
      }
    } catch (error) {
      console.error('Error verifying QR code:', error);
    }

    return false;
  }, [extractKey]);

  // Reset verification (for testing/debugging)
  const resetVerification = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.VERIFIED);
      localStorage.removeItem(STORAGE_KEYS.KEY_HASH);
      localStorage.removeItem(STORAGE_KEYS.VERIFIED_AT);
    } catch (error) {
      console.error('Error clearing QR verification:', error);
    }

    setIsVerified(false);
    setVerifiedAt(null);
  }, []);

  const value = {
    isVerified,
    verifiedAt,
    isLoading,
    verifyQRCode,
    resetVerification
  };

  return (
    <QRSecurityContext.Provider value={value}>
      {children}
    </QRSecurityContext.Provider>
  );
};

export default QRSecurityContext;
