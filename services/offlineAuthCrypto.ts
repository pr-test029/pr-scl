// Service de hachage cryptographique sécurisé (Web Crypto API SHA-256 avec Salt)

/**
 * Convertit un ArrayBuffer en chaîne hexadécimale
 */
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Génère un sel aléatoire cryptographique
 */
export const generateSalt = (): string => {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return bufferToHex(randomBytes.buffer);
};

/**
 * Hache un code unique avec SHA-256 et un sel spécifique
 * @param code Le code/matricule/mot de passe en clair
 * @param salt Le sel associé
 * @returns Le hash hexadécimal
 */
export const hashAuthCode = async (code: string, salt: string): Promise<string> => {
  const normalized = code.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
};

/**
 * Vérifie si un code saisi correspond à un hash et un sel stockés
 */
export const verifyAuthCode = async (
  inputCode: string,
  storedHash: string,
  salt: string
): Promise<boolean> => {
  const computedHash = await hashAuthCode(inputCode, salt);
  return computedHash.toLowerCase() === storedHash.toLowerCase();
};
