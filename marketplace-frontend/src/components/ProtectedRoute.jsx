// Route guard that checks the JWT in localStorage and (optionally) the user's role.
// Decodes the token payload locally so we don't trust the separately-stored `role`
// string, which a user can edit. Token signature is still verified by the backend
// on every API call.

import { Navigate, useLocation } from 'react-router-dom';

const decodeJwtPayload = (token) => {
  try {
    const part = token.split('.')[1];
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ children, allow }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const payload = token ? decodeJwtPayload(token) : null;

  // Intentionally impure: a route guard should re-evaluate freshness on every
  // render so tokens that expire mid-session redirect to login.
  // eslint-disable-next-line react-hooks/purity
  const isExpired = payload?.exp && payload.exp * 1000 < Date.now();
  if (!token || !payload || isExpired) {
    if (isExpired) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && !allow.includes(payload.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
