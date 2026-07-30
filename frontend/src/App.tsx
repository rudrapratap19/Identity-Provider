import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Simple static login just to protect the dashboard from accidental views.
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAdmin(true);
    } else {
      setError('Invalid password');
    }
  };

  if (isAdmin) {
    return (
      <>
        <Toaster position="top-right" />
        <Dashboard />
      </>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="glass-card login-card animate-slide-up">
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>IdP Admin</h1>
        <p style={{ textAlign: 'center' }}>Enter the admin password to manage OAuth clients.</p>
        
        {error && <div className="error-message animate-fade-in">{error}</div>}
        
        <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Hint: admin123"
              autoFocus
            />
          </div>
          <button type="submit">Access Dashboard</button>
        </form>
      </div>
    </div>
  );
}

export default App;
