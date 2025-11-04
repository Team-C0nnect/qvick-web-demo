import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';
import { DashboardIcon, DocumentIcon, NoticeIcon, CalendarIcon, RoomIcon } from './Icons';

export default function Sidebar() {
  const menuItems = [
    { path: '/', label: '대시 보드', icon: 'dashboard' },
    { path: '/check', label: '인원 확인', icon: 'check' },
    { path: '/notice', label: '공지사항', icon: 'notice' },
    { path: '/schedule', label: '일정 관리', icon: 'schedule' },
    { path: '/room', label: '방 관리', icon: 'room' },
  ];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'dashboard':
        return <DashboardIcon className="menu-icon" />;
      case 'check':
        return <DocumentIcon className="menu-icon" />;
      case 'notice':
        return <NoticeIcon className="menu-icon" />;
      case 'schedule':
        return <CalendarIcon className="menu-icon" />;
      case 'room':
        return <RoomIcon className="menu-icon" />;
      default:
        return <div className="menu-icon"></div>;
    }
  };

  return (
    <aside className="sidebar">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `menu-item ${isActive ? 'active' : ''}`
          }
        >
          {getIcon(item.icon)}
          <span className="menu-text">{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
