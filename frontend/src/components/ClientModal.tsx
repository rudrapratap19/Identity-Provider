import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClientModalProps {
  onClose: () => void;
  onSuccess: (credentials: any) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ClientModal({ onClose, onSuccess }: ClientModalProps) {
  const [name, setName] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('App name is required');
      return;
    }

    if (!validateUrl(redirectUri)) {
      setError('Please enter a valid Redirect URI (e.g., http://localhost:3000/callback)');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/clients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, redirectUris: [redirectUri] })
      });
      
      if (!res.ok) throw new Error('Failed to register client');
      
      const data = await res.json();
      toast.success('Client registered successfully!');
      onSuccess(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to register client');
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <div className="modal-header">
          <h2>Register New Client</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Application Name</label>
            <input 
              autoFocus
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. My Cool React App" 
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Redirect URI</label>
            <input 
              value={redirectUri} 
              onChange={e => setRedirectUri(e.target.value)} 
              placeholder="e.g. http://localhost:4000/callback" 
              disabled={isLoading}
            />
          </div>
          
          <button type="submit" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isLoading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
            ) : (
              <>
                <Plus size={20} />
                Generate Credentials
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
