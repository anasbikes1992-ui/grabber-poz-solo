import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

// Derive a 32-byte key from MASTER_ENCRYPTION_KEY or a secure fallback
const getMasterKey = (): Buffer => {
  const masterSecret = process.env.MASTER_ENCRYPTION_KEY || 'grabber-business-os-master-key-2026-production-vault';
  return crypto.createHash('sha256').update(masterSecret).digest();
};

/**
 * Encrypts a plaintext string (API secret, webhook token, etc.) using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv (12b) + authTag (16b) + ciphertext
  const payload = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, 'hex')
  ]);
  
  return payload.toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decryptSecret(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  
  try {
    const payload = Buffer.from(encryptedBase64, 'base64');
    
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encryption payload length');
    }
    
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err: any) {
    console.error('Failed to decrypt secret:', err.message);
    return '••••••••';
  }
}
