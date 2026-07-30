import { useState, useEffect } from 'react';
import { Search, Copy, Check, MoreVertical, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import StatsOverview from './StatsOverview';
import ClientModal from './ClientModal';
import SettingsView from './SettingsView';

interface Client {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  createdAt: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'settings'>('overview');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'id' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Client ID copied');
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast.success('Client Secret copied');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => window.location.reload()} 
      />
      
      <div className="main-content">
        <div className="header">
          <div>
            <h1>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'clients' && 'Registered OAuth Clients'}
              {activeTab === 'settings' && 'IdP Settings & Security'}
            </h1>
            <p style={{ margin: 0 }}>
              {activeTab === 'overview' && 'Overview of system status, metrics, and registered clients.'}
              {activeTab === 'clients' && 'Manage your registered applications and OAuth client credentials.'}
              {activeTab === 'settings' && 'Configure OAuth endpoints, token lifetimes, and security rules.'}
            </p>
          </div>
          {activeTab !== 'settings' && (
            <button className="btn-small" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowCreateModal(true)}>
              + New Client
            </button>
          )}
        </div>

        {activeTab === 'settings' ? (
          <SettingsView />
        ) : (
          <>
            <StatsOverview totalClients={clients.length} />

            {createdCredentials && (
              <div className="glass-card animate-slide-up" style={{ marginBottom: '2rem', borderColor: 'var(--accent)' }}>
                <h3>Client Created Successfully!</h3>
                <p>Please copy the Client Secret now. You will not be able to see it again.</p>
                <div className="code-block" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span><strong>Client ID:</strong> {createdCredentials.clientId}</span>
                    <button className="btn-icon" onClick={() => handleCopy(createdCredentials.clientId, 'id')} title="Copy ID">
                      {copiedId === createdCredentials.clientId ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Client Secret:</strong> {createdCredentials.clientSecret}</span>
                    <button className="btn-icon" onClick={() => handleCopy(createdCredentials.clientSecret, 'secret')} title="Copy Secret">
                      {copiedSecret ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <button className="btn-small" onClick={() => setCreatedCredentials(null)}>Dismiss</button>
              </div>
            )}

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Registered Clients</h2>
                <div className="search-bar" style={{ margin: 0, width: '250px' }}>
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Search clients..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>App Name</th>
                      <th>Client ID</th>
                      <th>Redirect URIs</th>
                      <th>Created</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex-center" style={{ padding: '3rem' }}>
                            <div className="spinner"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {c.clientId.substring(0, 8)}...
                              </span>
                              <button className="btn-icon" style={{ padding: '0.2rem' }} onClick={() => handleCopy(c.clientId, 'id')} title="Copy ID">
                                {copiedId === c.clientId ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.redirectUris.join(', ')}>
                              {c.redirectUris[0]} {c.redirectUris.length > 1 && `(+${c.redirectUris.length - 1})`}
                            </div>
                          </td>
                          <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="btn-icon">
                              <MoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                            <LayoutTemplate size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p style={{ margin: 0 }}>{searchQuery ? 'No clients match your search' : 'No clients registered yet.'}</p>
                            {!searchQuery && (
                              <button className="btn-small" style={{ marginTop: '1rem' }} onClick={() => setShowCreateModal(true)}>
                                Create your first client
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <ClientModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={(creds) => {
            setCreatedCredentials(creds);
            setShowCreateModal(false);
            fetchClients();
          }} 
        />
      )}
    </div>
  );
}
