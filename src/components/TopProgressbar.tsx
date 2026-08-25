import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/TopProgressbar.css';

export default function TopProgressbar() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timerId = window.setTimeout(() => setIsVisible(false), 500);

    return () => window.clearTimeout(timerId);
  }, [pathname]);

  if (!isVisible) return null;

  return <div className="top-progressbar" aria-hidden="true" />;
}
