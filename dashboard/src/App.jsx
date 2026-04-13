
import { BrowserRouter as Router, Routes, Route,Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import AuthPage from './pages/AuthPage';
import StoresHub from './pages/StoresHub';
import Profile from './pages/Profile';
import Reviews from './pages/Reviews';
import Integration from './pages/Integration';
import Analytics from './pages/Analytics';
import HubLayout from './components/HubLayout';
import StoreLayout from './components/StoreLayout';

// New Admin Components
import AdminOverview from './pages/admin/AdminOverview';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminStores from './pages/admin/AdminStores';
import AdminUsers from './pages/admin/AdminUsers';


// Route Guards
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/hub/stores" replace />;
};

const AuthRoute = () => {
  const { user } = useAuth();
  // The magic fix: Admins land on overview, Owners land on stores!
  if (user) {
    return <Navigate to={user.role === 'admin' ? "/hub/admin/overview" : "/hub/stores"} replace />;
  }
  return <AuthPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthRoute />} />
          
          {/* THE HUB ROUTES */}
          <Route path="/hub/*" element={
            <ProtectedRoute>
              <HubLayout>
                <Routes>
                  <Route path="stores" element={<StoresHub />} />
                  <Route path="profile" element={<Profile />} />
                  
                  {/* ADMIN ROUTES IN THE HUB */}
                  <Route path="admin/overview" element={<AdminRoute><AdminOverview /></AdminRoute>} />
                  <Route path="admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
                  <Route path="admin/stores" element={<AdminRoute><AdminStores /></AdminRoute>} />
                  <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

                  <Route path="*" element={<Navigate to="stores" replace />} />
                </Routes>
              </HubLayout>
            </ProtectedRoute>
          } />

           {/* THE STORE WORKSPACE ROUTES */}
          <Route path="/workspace/*" element={
            <ProtectedRoute>
              <StoreLayout>
                <Routes>
                  <Route path="reviews" element={<Reviews />} />
                  {/* Updated Analytics wildcard route */}
                  <Route path="analytics/*" element={<Analytics />} />
                  <Route path="integration" element={<Integration />} />
                  <Route path="*" element={<Navigate to="analytics/overview" replace />} />
                </Routes>
              </StoreLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}