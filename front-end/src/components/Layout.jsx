import { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Dock from './reactbits/Dock';
import FriendsPanel from './FriendsPanel';
import { FiHome, FiUsers, FiClock, FiLogOut, FiTarget } from 'react-icons/fi';

export default function Layout() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [friendsOpen, setFriendsOpen] = useState(false);

  const dockItems = [
    {
      icon: <FiHome size={20} />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard'),
      className: location.pathname === '/dashboard' ? 'dock-active' : ''
    },
    {
      icon: <FiTarget size={20} />,
      label: 'Solo',
      onClick: () => navigate('/solo'),
      className: location.pathname.startsWith('/solo') ? 'dock-active' : ''
    },
    {
      icon: <FiUsers size={20} />,
      label: 'Friends',
      onClick: () => setFriendsOpen(true),
      className: friendsOpen ? 'dock-active' : ''
    },
    {
      icon: <FiClock size={20} />,
      label: 'History',
      onClick: () => navigate('/history'),
      className: location.pathname === '/history' ? 'dock-active' : ''
    },
    {
      icon: <FiLogOut size={20} />,
      label: 'Logout',
      onClick: () => { logout(); navigate('/login'); }
    }
  ];

  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>
      <Dock
        items={dockItems}
        panelHeight={56}
        baseItemSize={44}
        magnification={58}
        distance={120}
      />
      <FriendsPanel open={friendsOpen} onClose={() => setFriendsOpen(false)} />
    </div>
  );
}
