import { Key, Shield, Clock, Server, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsView() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved successfully');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={22} color="var(--accent)" />
          Identity Provider Configuration
        </h2>
        <p style={{ marginBottom: '1.5rem' }}>Core OAuth 2.0 & OIDC server endpoints.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Issuer URL</label>
            <input type="text" readOnly value="http://localhost:3000" style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-group">
            <label>Authorization Endpoint</label>
            <input type="text" readOnly value="http://localhost:3000/oauth/authorize" style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-group">
            <label>Token Endpoint</label>
            <input type="text" readOnly value="http://localhost:3000/oauth/token" style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-group">
            <label>JWKS URI (Public Keys)</label>
            <input type="text" readOnly value="http://localhost:3000/oauth/jwks.json" style={{ fontFamily: 'monospace' }} />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={22} color="var(--accent)" />
          Token & Key Management
        </h2>
        <p style={{ marginBottom: '1.5rem' }}>Cryptographic signing and token expiration policies.</p>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} /> Access Token Expiry (Seconds)
              </label>
              <input type="number" defaultValue={3600} />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} /> Refresh Token Expiry (Days)
              </label>
              <input type="number" defaultValue={30} />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={16} /> Signing Algorithm
              </label>
              <input type="text" readOnly value="RS256 (RSA 2048-bit)" style={{ fontFamily: 'monospace' }} />
            </div>
          </div>

          <button type="submit" className="btn-small" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
            <Check size={18} />
            Save Settings
          </button>
        </form>
      </div>

      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={22} color="var(--accent)" />
          Security Policies
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div>
              <strong>Enforce PKCE (Proof Key for Code Exchange)</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Required for SPA and mobile clients to prevent code interception.</p>
            </div>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div>
              <strong>Strict Redirect URI Matching</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Rejects wildcards or non-HTTPS URIs in production.</p>
            </div>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
