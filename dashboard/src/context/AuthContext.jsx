import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../Api';
import { setAccessToken } from '../Api';
import { toast } from 'react-toastify';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
let initialized = false;

const normalizeUser = (raw = {}) => {
  const userProfile = { ...raw };
  delete userProfile.accessToken;
  return {
    ...userProfile,
    role: userProfile.role || null,
    storeRole: userProfile.storeRole || 'support',
    permissions: userProfile.permissions || [],
    parentAccount: userProfile.parentAccount || null,
    staffScope: userProfile.staffScope || null,
    parentRole: userProfile.parentRole || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeStore, setActiveStore] = useState(() => {
    const saved = sessionStorage.getItem('active_store');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeStore) sessionStorage.setItem('active_store', JSON.stringify(activeStore));
    else sessionStorage.removeItem('active_store');
  }, [activeStore]);

  useEffect(() => {
    if (initialized) return;
    initialized = true;
    
    const checkSession = async () => {
      const hasSession = localStorage.getItem('has_session');
      if (!hasSession) { setLoading(false); return; }

      try {
        const res = await api.post('/users/refresh');
        setAccessToken(res.data.accessToken);
        setUser(normalizeUser(res.data.user));
      } catch (error) {
        toast.error("Session expired. Please log in again.");
        setUser(null); setActiveStore(null); localStorage.removeItem('has_session');
      } finally { setLoading(false); }
    };
    checkSession();
  },[]);

  // 1. LOGIN
  const login = async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    setAccessToken(res.data.user.accessToken.token); 
    const normalized = normalizeUser(res.data.user);
    setUser(normalized);
    localStorage.setItem('has_session', 'true');
    return normalized;
  };

  // 2. REGISTER (Does NOT log in, just returns the response)
  const register = async (userName, email, password, confirmPassword) => {
    return await api.post('/users/register', { userName, email, password, confirmPassword });
  };

  // 3. VERIFY OTP (Logs them in!)
  const verifyOtp = async (email, otp) => {
    const res = await api.post('/users/verify-otp', { email, otp });
    setAccessToken(res.data.user.accessToken.token); 
    const normalized = normalizeUser(res.data.user);
    setUser(normalized);
    localStorage.setItem('has_session', 'true');
    return normalized;
  };

  // 4. RESEND OTP
  const resendOtp = async (email) => {
    return await api.post('/users/resend-otp', { email });
  };

  const requestLoginOtp = async (email) => {
    return await api.post('/users/login-otp/request', { email });
  };

  const verifyLoginOtp = async (email, otp) => {
    const res = await api.post('/users/login-otp/verify', { email, otp });
    const tokenValue = res.data.user?.accessToken?.token || res.data.accessToken;
    setAccessToken(tokenValue);
    const normalized = normalizeUser(res.data.user);
    setUser(normalized);
    localStorage.setItem('has_session', 'true');
    return normalized;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/users/auth/google', { credential });
    const tokenValue = res.data.user?.accessToken?.token || res.data.accessToken;
    setAccessToken(tokenValue);
    const normalized = normalizeUser(res.data.user);
    setUser(normalized);
    localStorage.setItem('has_session', 'true');
    return { user: normalized, isNewUser: Boolean(res.data.isNewUser) };
  };

  // 5. ACCEPT STAFF INVITE (Logs them in!)
  const acceptInvite = async ({ email, token, password, confirmPassword, userName }) => {
    const res = await api.post('/users/accept-invite', {
      email, token, password, confirmPassword, userName,
    });
    const tokenValue = res.data.accessToken || res.data.user?.accessToken?.token;
    setAccessToken(tokenValue);
    const normalized = normalizeUser(res.data.user);
    setUser(normalized);
    localStorage.setItem('has_session', 'true');
    return { ...res.data, user: normalized };
  };

  const logout = async () => {
    try { await api.post('/users/logout'); } catch (err) {} 
    finally {
      setAccessToken(null); setUser(null); setActiveStore(null); localStorage.removeItem('has_session');
      sessionStorage.removeItem('echo_workspace_mode');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center text-cyan-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="animate-pulse tracking-widest font-mono text-sm">VERIFYING SECURE SESSION</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, setUser, activeStore, setActiveStore,
      login, register, verifyOtp, resendOtp,
      requestLoginOtp, verifyLoginOtp, loginWithGoogle,
      acceptInvite, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
