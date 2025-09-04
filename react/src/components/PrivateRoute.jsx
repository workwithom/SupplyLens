import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Redirect them to the login page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
