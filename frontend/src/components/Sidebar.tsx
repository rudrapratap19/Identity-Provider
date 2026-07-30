import { LayoutDashboard, Users, Settings, ShieldAlert, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'clients' | 'settings';
  setActiveTab: (tab: 'overview' | 'clients' | 'settings') => void;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <ShieldAlert size={28} style={{ color: 'var(--accent)' }} />
        IdP Admin
      </div>
      
      <div className="sidebar-nav">
        <button 
          className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{ background: 'none', border: 'none', font: 'inherit', width: '100%', textAlign: 'left' }}
        >
          <LayoutDashboard size={20} />
          Overview
        </button>
        <button 
          className={`sidebar-item ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
          style={{ background: 'none', border: 'none', font: 'inherit', width: '100%', textAlign: 'left' }}
        >
          <Users size={20} />
          Clients
        </button>
        <button 
          className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ background: 'none', border: 'none', font: 'inherit', width: '100%', textAlign: 'left' }}
        >
          <Settings size={20} />
          Settings
        </button>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button 
          className="sidebar-item" 
          style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '0.75rem 1rem' }} 
          onClick={onLogout}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
