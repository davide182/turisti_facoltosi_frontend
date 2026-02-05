import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Building, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart3,
  UserPlus
} from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    { path: '/utenti', label: 'Utenti', icon: <Users className="h-5 w-5" /> },
    { path: '/abitazioni', label: 'Abitazioni', icon: <Building className="h-5 w-5" /> },
    { path: '/host', label: 'Host', icon: <UserPlus className="h-5 w-5" /> },
    { path: '/prenotazioni', label: 'Prenotazioni', icon: <Calendar className="h-5 w-5" /> },
    { path: '/feedback', label: 'Feedback', icon: <MessageSquare className="h-5 w-5" /> },
    { path: '/statistiche', label: 'Statistiche', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">Turista Facoltoso</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* area vuota per mantenere il layout */}
          <div></div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;