import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/authApi';

const AdminRoute = ({ children }) => {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
};

export default AdminRoute;

