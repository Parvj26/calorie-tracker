/**
 * Client-side encryption for sensitive data (API keys)
 * Uses AES-GCM with a key derived from user ID
 */

const SALT = 'CalorieTracker-v1-salt'; // App-specific salt
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derive an encryption key from the user's ID
 */
async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 * Returns base64 encoded string with IV prepended
 */
export async function encryptValue(value: string, userId: string): Promise<string> {
  if (!value) return '';

  try {
    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(value)
    );

    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return 'enc:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return value; // Return original on failure (backwards compatibility)
  }
}

/**
 * Decrypt a string value
 * Expects base64 encoded string with IV prepended
 */
export async function decryptValue(encryptedValue: string, userId: string): Promise<string> {
  if (!encryptedValue) return '';

  // Check if value is encrypted (has our prefix)
  if (!encryptedValue.startsWith('enc:')) {
    // Return as-is (not encrypted, legacy data)
    return encryptedValue;
  }

  try {
    const key = await deriveKey(userId);
    const decoder = new TextDecoder();

    // Remove prefix and decode base64
    const combined = Uint8Array.from(atob(encryptedValue.slice(4)), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return ''; // Return empty on failure (key might be corrupted)
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith('enc:') ?? false;
}
