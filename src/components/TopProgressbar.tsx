import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelectedDate } from '../context/SelectedDateContext';
import '../styles/TopProgressbar.css';

export default function TopProgressbar() {
  const { pathname } = useLocation();
  const { selectedDate } = useSelectedDate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timerId = window.setTimeout(() => setIsVisible(false), 600);

    return () => window.clearTimeout(timerId);
  }, [pathname, selectedDate]);

  if (!isVisible) return null;

  return <div className="top-progressbar" aria-hidden="true" />;
}
