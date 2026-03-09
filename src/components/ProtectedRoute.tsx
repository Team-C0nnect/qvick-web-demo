import { Navigate } from 'react-router-dom';
import { useDemoMode } from '../demo/DemoContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isDemo } = useDemoMode();

  // 데모 모드에서는 인증 우회
  if (isDemo) return <>{children}</>;

  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
