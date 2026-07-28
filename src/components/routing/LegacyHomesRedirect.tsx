import { Navigate, useLocation } from 'react-router-dom';

/** Redirect legacy `/homes` URLs to `/projects` (path segment only). */
export function LegacyHomesRedirect() {
  const location = useLocation();
  const newPath = location.pathname.replace(/\/homes\b/g, '/projects');
  return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
}
