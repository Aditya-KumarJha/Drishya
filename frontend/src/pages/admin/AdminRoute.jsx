import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppSkeleton } from '../../App';
import { getCurrentUser } from '../../services/authApi';

const AdminRoute = ({ children }) => {
  const { user: sessionUser, isInitialized } = useSelector((state) => state.auth);
  const user = sessionUser || getCurrentUser();

  if (!isInitialized) {
    return <AppSkeleton />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
};

export default AdminRoute;
