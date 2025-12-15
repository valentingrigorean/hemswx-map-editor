import { useSignal } from '@preact/signals';
import {
  arcgisCredentials,
  saveCredentials,
  clearCredentials,
  isCredentialsConfigured,
  hasApiKey
} from '../../lib/credentials';
import {
  PORTAL_URL,
  OAUTH_CLIENT_ID,
  arcgisState,
  initializeArcGIS,
  destroyArcGIS
} from '../../lib/arcgis';

export default function ArcGISSettingsSection() {
  const apiKey = useSignal(arcgisCredentials.value?.apiKey || '');
  const isSaving = useSignal(false);
  const testResult = useSignal<{ success: boolean; message: string } | null>(null);

  const handleSave = async () => {
    isSaving.value = true;
    testResult.value = null;

    try {
      const credentials = {
        apiKey: apiKey.value || undefined
      };

      saveCredentials(credentials);

      destroyArcGIS();
      await initializeArcGIS(credentials);

      testResult.value = { success: true, message: 'Configuration saved' };
    } catch (error) {
      testResult.value = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save credentials'
      };
    } finally {
      isSaving.value = false;
    }
  };

  const handleClear = () => {
    clearCredentials();
    destroyArcGIS();
    apiKey.value = '';
    testResult.value = { success: true, message: 'Credentials cleared' };
  };

  const callbackUrl = (() => {
    try {
      const prefix = import.meta.env.BASE_URL;
      const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      return `${window.location.origin}${normalizedPrefix}oauth-callback.html`;
    } catch {
      return '';
    }
  })();

  return (
    <div className="mb-8 pb-6 border-b border-slate-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">ArcGIS Configuration</h4>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            isCredentialsConfigured.value
              ? 'bg-green-600/30 text-green-300 border border-green-600'
              : 'bg-orange-600/30 text-orange-300 border border-orange-600'
          }`}
        >
          {isCredentialsConfigured.value ? 'Configured' : 'Not Set'}
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Configure ArcGIS settings for map preview. Portal items from {PORTAL_URL} require OAuth sign-in.
      </p>

      <div className="space-y-6">
        {/* API Key Section */}
        <div>
          <div className="form-group mb-3">
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="form-input font-mono"
              value={apiKey.value}
              onInput={(e) => {
                apiKey.value = (e.target as HTMLInputElement).value;
                testResult.value = null;
              }}
              placeholder="Enter ArcGIS API Key"
            />
            <p className="text-xs text-slate-500 mt-1">
              For accessing ArcGIS basemaps and services. Get one at developers.arcgis.com
            </p>
          </div>

          {/* Result message */}
          {testResult.value && (
            <div
              className={`mb-3 p-2 rounded text-sm ${
                testResult.value.success
                  ? 'bg-green-900/30 text-green-300 border border-green-700'
                  : 'bg-red-900/30 text-red-300 border border-red-700'
              }`}
            >
              {testResult.value.success ? '✓ ' : '✗ '}
              {testResult.value.message}
            </div>
          )}

          {/* API Key Actions */}
          <div className="flex gap-2">
            <button
              className="btn primary small"
              onClick={handleSave}
              disabled={isSaving.value}
            >
              {isSaving.value ? 'Saving...' : 'Save API Key'}
            </button>
            {hasApiKey.value && (
              <button className="btn danger small" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Portal OAuth Info (read-only) */}
        <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
          <div>
            <h5 className="text-sm font-medium text-slate-200 mb-1">Portal Authentication</h5>
            <p className="text-xs text-slate-400">
              OAuth sign-in is available in the Map Preview panel when viewing portal items.
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>
              <span className="text-slate-500">Client ID:</span>{' '}
              <span className="font-mono text-slate-300">{OAUTH_CLIENT_ID}</span>
            </div>
            <div>
              <span className="text-slate-500">Portal:</span>{' '}
              <span className="font-mono text-slate-300">{PORTAL_URL}</span>
            </div>
            <div>
              <span className="text-slate-500">Redirect URI:</span>{' '}
              <span className="font-mono text-slate-300">{callbackUrl || '(open in browser)'}</span>
            </div>
            {arcgisState.value.portalAuthenticated && (
              <div className="mt-2 pt-2 border-t border-slate-600">
                <span className="text-green-400">Signed in as {arcgisState.value.signedInUserId || 'user'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
