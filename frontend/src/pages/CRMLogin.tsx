import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { crmLogin } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle, Lock } from 'lucide-react';

export const CRMLogin: React.FC = () => {
  const [email, setEmail] = useState('admin@showroom.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/crm/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CRMLogin] Form submitted. Email:', email);
    setError('');
    setLoading(true);

    try {
      console.log('[CRMLogin] Calling crmLogin API...');
      const data = await crmLogin(email, password);
      console.log('[CRMLogin] crmLogin success. Token received:', data?.access_token ? 'YES' : 'NO', data);

      if (data?.access_token) {
        login(data.access_token);
        console.log('[CRMLogin] Auth token set. Navigating to /crm/dashboard...');
        navigate('/crm/dashboard', { replace: true });
      } else {
        setError('Login failed: Server did not return an access token.');
      }
    } catch (err: any) {
      console.error('[CRMLogin] crmLogin error caught:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCredentials = () => {
    console.log('[CRMLogin] Filling demo credentials');
    setEmail('admin@showroom.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-hyundai-blue text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="z-10 text-center max-w-md">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-hyundai-blue font-bold text-3xl mx-auto mb-6">H</div>
          <h1 className="text-4xl font-bold mb-4">Hyundai Showroom CRM</h1>
          <p className="text-xl text-gray-300">Manage leads, monitor AI interactions, and close deals faster.</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-hyundai-blue rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">H</div>
            <h2 className="text-2xl font-bold">Hyundai CRM</h2>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Please enter your details to sign in.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6 border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-hyundai-blue focus:border-hyundai-blue outline-none transition-all"
                placeholder="admin@showroom.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-hyundai-blue focus:border-hyundai-blue outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary mt-4 flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Lock className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div
            onClick={handleFillDemoCredentials}
            className="mt-8 text-center bg-gray-50 hover:bg-blue-50/50 p-4 rounded-xl text-sm text-gray-600 border border-gray-200 hover:border-blue-200 cursor-pointer transition-all group"
            title="Click to auto-fill demo credentials"
          >
            <p className="font-semibold mb-1 text-hyundai-blue group-hover:underline">Demo Credentials (Click to Auto-fill)</p>
            <p>Email: <span className="font-mono bg-gray-200 group-hover:bg-blue-100 px-1.5 py-0.5 rounded text-gray-800">admin@showroom.com</span></p>
            <p>Password: <span className="font-mono bg-gray-200 group-hover:bg-blue-100 px-1.5 py-0.5 rounded text-gray-800">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

