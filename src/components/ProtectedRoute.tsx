import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken || accessToken === 'demo-token') {
    if (accessToken === 'demo-token') {
      localStorage.removeItem('accessToken');
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
