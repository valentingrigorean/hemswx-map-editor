import { signal } from '@preact/signals';
import esriConfig from '@arcgis/core/config';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';
import Basemap from '@arcgis/core/Basemap';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
import WMTSLayer from '@arcgis/core/layers/WMTSLayer';
import TileLayer from '@arcgis/core/layers/TileLayer';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Layer from '@arcgis/core/layers/Layer';
import PortalItem from '@arcgis/core/portal/PortalItem';
import type { LayerConfig } from '../types';
import type { ArcGISCredentials } from '../credentials';

export const PORTAL_URL = 'https://snla.maps.arcgis.com/';
export const OAUTH_CLIENT_ID = 'db46wbxZvOmUif1n';
const PORTAL_SHARING_URL = `${PORTAL_URL}sharing`;

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function shouldUseLocalWmsProxy(): boolean {
  if (typeof window === 'undefined') return false;
  return isLocalhostHost(window.location.hostname);
}

function getWmsProxyEndpoint(): string {
  const prefix = import.meta.env.BASE_URL;
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return `${normalizedPrefix}wms-proxy`;
}

function registerWmsProxyInterceptor(): void {
  if (!shouldUseLocalWmsProxy()) return;

  if (!esriConfig.request.interceptors) {
    esriConfig.request.interceptors = [];
  }

  esriConfig.request.interceptors.push({
    before: (params) => {
      const url = params.url;

      // Skip if already going through our proxy
      if (url.includes('wms-proxy')) return;

      // Skip ArcGIS services - they have proper CORS
      if (url.includes('arcgis.com') || url.includes('arcgisonline.com')) return;

      // Only proxy WMS/WMTS requests (detected by service parameter)
      const isWmsRequest = /[?&](service=wms|request=getmap|request=getcapabilities)/i.test(url);
      if (!isWmsRequest) return;

      // Rewrite to use proxy
      const proxyUrl = getWmsProxyEndpoint();
      params.url = `${window.location.origin}${proxyUrl}?target=${encodeURIComponent(url)}`;
    }
  });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybeMessage = (error as any).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
    const maybeDetails = (error as any).details;
    if (typeof maybeDetails === 'string' && maybeDetails.trim()) return maybeDetails;
    const maybeError = (error as any).error;
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error creating layer';
    }
  }
  return 'Unknown error creating layer';
}

function getOAuthCallbackUrl(): string {
  const prefix = import.meta.env.BASE_URL;
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return `${window.location.origin}${normalizedPrefix}oauth-callback.html`;
}

function getSignedInUserId(): string | null {
  try {
    const cred = IdentityManager.findCredential(PORTAL_SHARING_URL);
    return (cred as any)?.userId || null;
  } catch {
    return null;
  }
}

export interface ArcGISState {
  initialized: boolean;
  apiKeySet: boolean;
  portalAuthenticated: boolean;
  oauthClientId?: string;
  signedInUserId?: string | null;
  error: string | null;
}

export interface LayerPreviewResult {
  success: boolean;
  layer?: __esri.Layer;
  error?: string;
}

export const arcgisState = signal<ArcGISState>({
  initialized: false,
  apiKeySet: false,
  portalAuthenticated: false,
  oauthClientId: undefined,
  signedInUserId: null,
  error: null
});

let portalInstance: Portal | null = null;
let oauthInfo: OAuthInfo | null = null;

export function isOAuthConfigured(): boolean {
  return !!OAUTH_CLIENT_ID;
}

function ensureOAuthRegistered(): boolean {
  if (oauthInfo) return true;
  if (!OAUTH_CLIENT_ID) return false;

  oauthInfo = new OAuthInfo({
    appId: OAUTH_CLIENT_ID,
    portalUrl: PORTAL_URL,
    popup: true,
    popupCallbackUrl: getOAuthCallbackUrl()
  });
  IdentityManager.registerOAuthInfos([oauthInfo]);

  arcgisState.value = {
    ...arcgisState.value,
    oauthClientId: OAUTH_CLIENT_ID
  };

  return true;
}

export async function refreshPortalAuthStatus(): Promise<void> {
  if (!ensureOAuthRegistered()) {
    arcgisState.value = {
      ...arcgisState.value,
      portalAuthenticated: false,
      signedInUserId: null
    };
    return;
  }

  try {
    await IdentityManager.checkSignInStatus(PORTAL_SHARING_URL);
    arcgisState.value = {
      ...arcgisState.value,
      portalAuthenticated: true,
      signedInUserId: getSignedInUserId()
    };
  } catch {
    arcgisState.value = {
      ...arcgisState.value,
      portalAuthenticated: false,
      signedInUserId: null
    };
  }
}

export async function signInWithOAuth(): Promise<void> {
  if (!ensureOAuthRegistered()) {
    throw new Error('OAuth is not configured. No OAuth Client ID available.');
  }
  await IdentityManager.getCredential(PORTAL_SHARING_URL);
  await refreshPortalAuthStatus();
}

export function signOutFromOAuth(): void {
  IdentityManager.destroyCredentials();
  arcgisState.value = {
    ...arcgisState.value,
    portalAuthenticated: false,
    signedInUserId: null
  };
}

export async function initializeArcGIS(credentials: ArcGISCredentials): Promise<void> {
  try {
    arcgisState.value = {
      ...arcgisState.value,
      error: null
    };

    if (credentials.apiKey) {
      esriConfig.apiKey = credentials.apiKey;
      arcgisState.value = {
        ...arcgisState.value,
        apiKeySet: true
      };
    }

    if (ensureOAuthRegistered()) {
      await refreshPortalAuthStatus();
    }

    registerWmsProxyInterceptor();

    arcgisState.value = {
      ...arcgisState.value,
      initialized: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize ArcGIS';
    arcgisState.value = {
      ...arcgisState.value,
      error: errorMessage
    };
    throw error;
  }
}

export async function testConnection(credentials: ArcGISCredentials): Promise<{
  success: boolean;
  apiKeyValid: boolean;
  portalValid: boolean;
  error?: string;
}> {
  const result = {
    success: false,
    apiKeyValid: false,
    portalValid: false,
    error: undefined as string | undefined
  };

  try {
    if (credentials.apiKey) {
      result.apiKeyValid = true;
    }

    if (credentials.oauthClientId) {
      // Only verifies whether the user is already signed in.
      try {
        await IdentityManager.checkSignInStatus(PORTAL_SHARING_URL);
        result.portalValid = true;
      } catch {
        result.portalValid = false;
      }
    }

    result.success = result.apiKeyValid || result.portalValid;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Connection test failed';
    return result;
  }
}

export function destroyArcGIS(): void {
  IdentityManager.destroyCredentials();
  esriConfig.apiKey = '';
  portalInstance = null;
  oauthInfo = null;
  arcgisState.value = {
    initialized: false,
    apiKeySet: false,
    portalAuthenticated: false,
    oauthClientId: undefined,
    signedInUserId: null,
    error: null
  };
}

export async function createLayerFromConfig(config: LayerConfig): Promise<LayerPreviewResult> {
  let layer: __esri.Layer;

  switch (config.type) {
    case 'wms': {
      const useProxy = shouldUseLocalWmsProxy();
      const url = useProxy ? getWmsProxyEndpoint() : config.source;
      const customParameters: Record<string, string> = {};

      if (config.options) {
        Object.entries(config.options).forEach(([key, value]) => {
          if (key !== 'layerNames' && key !== 'opacity' && key !== 'layerId') {
            customParameters[key] = String(value);
          }
        });
      }

      if (useProxy) {
        customParameters.target = config.source;
      }

      layer = new WMSLayer({
        url,
        sublayers: config.options?.layerNames?.map(name => ({ name })) || [],
        opacity: config.options?.opacity ?? 1,
        customParameters: Object.keys(customParameters).length > 0 ? customParameters : undefined,
        useViewTime: true
      });
      break;
    }

    case 'tiled':
      layer = new TileLayer({
        url: config.source,
        opacity: config.options?.opacity ?? 1
      });
      break;

    case 'mapImage':
      layer = new MapImageLayer({
        url: config.source,
        opacity: config.options?.opacity ?? 1
      });
      break;

    case 'vectorTiled':
      layer = new VectorTileLayer({
        url: config.source,
        opacity: config.options?.opacity ?? 1
      });
      break;

    case 'feature':
      layer = new FeatureLayer({
        url: config.source,
        opacity: config.options?.opacity ?? 1
      });
      break;

    case 'portalItem': {
      const portalItem = new PortalItem({
        id: config.source,
        portal: { url: PORTAL_URL }
      });
      const rawLayerId = config.options?.layerId;
      const layerId = rawLayerId !== undefined ? Number(rawLayerId) : undefined;

      const portalLayer = await Layer.fromPortalItem({
        portalItem,
        layerId: Number.isFinite(layerId) ? layerId : undefined
      });

      if (!portalLayer) {
        return { success: false, error: 'Failed to create layer from portal item' };
      }

      portalLayer.opacity = config.options?.opacity ?? 1;
      layer = portalLayer;
      break;
    }

    case 'wmts': {
      // Portal item source - load via portal
      if (config.sourceKind === 'portalItem') {
        const portalItem = new PortalItem({
          id: config.source,
          portal: { url: PORTAL_URL }
        });

        const portalLayer = await Layer.fromPortalItem({ portalItem });

        if (!portalLayer) {
          return { success: false, error: 'Failed to create WMTS layer from portal item' };
        }

        portalLayer.opacity = config.options?.opacity ?? 1;
        layer = portalLayer;
        break;
      }

      // URL source - use proxy on localhost
      const useProxy = shouldUseLocalWmsProxy();
      const url = useProxy ? getWmsProxyEndpoint() : config.source;
      const customParameters: Record<string, string> = {};

      if (config.options) {
        Object.entries(config.options).forEach(([key, value]) => {
          if (key !== 'layerNames' && key !== 'opacity' && key !== 'layerId' && key !== 'serviceMode') {
            customParameters[key] = String(value);
          }
        });
      }

      if (useProxy) {
        customParameters.target = config.source;
      }

      const wmtsOptions: __esri.WMTSLayerProperties = {
        url,
        opacity: config.options?.opacity ?? 1,
        customParameters: Object.keys(customParameters).length > 0 ? customParameters : undefined
      };

      if (config.options?.serviceMode) {
        wmtsOptions.serviceMode = config.options.serviceMode as 'RESTful' | 'KVP';
      }

      const activeLayerId = config.options?.layerId ?? config.options?.layerNames?.[0];
      if (activeLayerId) {
        wmtsOptions.activeLayer = {
          id: String(activeLayerId)
        };
      }

      layer = new WMTSLayer(wmtsOptions);
      break;
    }

    default:
      return { success: false, error: `Unsupported layer type: ${(config as any).type}` };
  }

  return { success: true, layer };
}

export function getPortal(): Portal | null {
  return portalInstance;
}

export { Basemap };
