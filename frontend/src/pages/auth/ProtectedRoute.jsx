import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppSkeleton } from '../../App';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  // Redux state se auth status nikalna
  const { user, isAuthenticated, loading, isInitialized} = useSelector(state => state.auth);

  // Agar abhi check ho raha hai (loading), toh blank screen ya spinner dikhayein
    if(!isInitialized){return <AppSkeleton/>}
  

  // Agar user authenticated nahi hai aur dashboard access kar raha hai -> Redirect to SignIn
  if (!isAuthenticated && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Agar user authenticated hai aur wapas login/signup par jana chahe -> Redirect to Dashboard
  if (isAuthenticated && (location.pathname === "/signin" || location.pathname === "/signup" || location.pathname === "/")) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;