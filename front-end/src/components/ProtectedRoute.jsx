import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="page-loading">
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
