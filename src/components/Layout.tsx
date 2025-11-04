import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import '../styles/Layout.css';

export default function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <div className="content-wrapper">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
