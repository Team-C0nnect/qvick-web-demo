import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './sidebar/Sidebar';
import TopProgressbar from './TopProgressbar';
import { SelectedDateProvider } from '../context/SelectedDateContext';
import { AttendanceViewProvider } from '../context/AttendanceViewContext';
import { GenderViewProvider } from '../context/GenderViewContext';
import '../styles/Layout.css';

export interface LayoutOutletContext {
  setHeaderActions: (actions: ReactNode) => void;
}

export default function Layout() {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  return (
    <SelectedDateProvider>
      <AttendanceViewProvider>
        <GenderViewProvider>
          <TopProgressbar />
          <div className="app-layout">
            <Header actions={headerActions} />
            <div className="content-wrapper">
              <Sidebar />
              <main className="main-content">
                <Outlet context={{ setHeaderActions } satisfies LayoutOutletContext} />
              </main>
            </div>
          </div>
        </GenderViewProvider>
      </AttendanceViewProvider>
    </SelectedDateProvider>
  );
}
