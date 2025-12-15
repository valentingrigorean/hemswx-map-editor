import { signal, computed } from '@preact/signals';

export interface ArcGISCredentials {
  apiKey?: string;
}

const STORAGE_KEY = 'hemswx-arcgis-credentials';
const OBFUSCATION_KEY = 'hemswx-map-editor-2024';

function obfuscate(text: string): string {
  const encoded = new TextEncoder().encode(text);
  const key = new TextEncoder().encode(OBFUSCATION_KEY);
  const result = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ key[i % key.length];
  }
  return btoa(String.fromCharCode(...result));
}

function deobfuscate(encoded: string): string {
  try {
    const decoded = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const key = new TextEncoder().encode(OBFUSCATION_KEY);
    const result = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      result[i] = decoded[i] ^ key[i % key.length];
    }
    return new TextDecoder().decode(result);
  } catch {
    return '';
  }
}

export function loadCredentials(): ArcGISCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const deobfuscated = deobfuscate(stored);
    if (!deobfuscated) return null;

    const parsed = JSON.parse(deobfuscated);
    return {
      apiKey: parsed.apiKey || undefined
    };
  } catch (error) {
    console.warn('Failed to load ArcGIS credentials:', error);
    return null;
  }
}

export function saveCredentials(credentials: ArcGISCredentials): void {
  try {
    const json = JSON.stringify(credentials);
    const obfuscated = obfuscate(json);
    localStorage.setItem(STORAGE_KEY, obfuscated);
    arcgisCredentials.value = credentials;
  } catch (error) {
    console.warn('Failed to save ArcGIS credentials:', error);
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    arcgisCredentials.value = null;
  } catch (error) {
    console.warn('Failed to clear ArcGIS credentials:', error);
  }
}

export const arcgisCredentials = signal<ArcGISCredentials | null>(loadCredentials());

export const isCredentialsConfigured = computed(() => {
  const creds = arcgisCredentials.value;
  if (!creds) return false;
  return !!creds.apiKey;
});

export const hasApiKey = computed(() => !!arcgisCredentials.value?.apiKey);

// OAuth client id is intentionally not stored; it is configured in code.
