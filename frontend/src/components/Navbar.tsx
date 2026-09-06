import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserCircle } from 'lucide-react';

interface NavbarProps {
  userEmail: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/crm/login');
  };

  return (
    <nav className="bg-hyundai-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/crm/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-hyundai-blue font-bold text-lg">H</div>
              <span className="font-semibold text-lg tracking-wide">Hyundai CRM</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-200">
              <UserCircle className="w-5 h-5" />
              <span className="hidden sm:inline">{userEmail}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-blue-900 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
