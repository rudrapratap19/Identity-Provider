import { Activity, ShieldCheck, Clock } from 'lucide-react';

interface StatsOverviewProps {
  totalClients: number;
}

export default function StatsOverview({ totalClients }: StatsOverviewProps) {
  return (
    <div className="stats-grid animate-fade-in">
      <div className="glass-card stat-card">
        <div className="stat-icon">
          <ShieldCheck size={28} />
        </div>
        <div className="stat-details">
          <h4>Active Clients</h4>
          <div className="value">{totalClients}</div>
        </div>
      </div>
      
      <div className="glass-card stat-card">
        <div className="stat-icon">
          <Activity size={28} />
        </div>
        <div className="stat-details">
          <h4>Status</h4>
          <div className="value" style={{ color: '#34d399' }}>Healthy</div>
        </div>
      </div>
      
      <div className="glass-card stat-card">
        <div className="stat-icon">
          <Clock size={28} />
        </div>
        <div className="stat-details">
          <h4>Uptime</h4>
          <div className="value">99.9%</div>
        </div>
      </div>
    </div>
  );
}
