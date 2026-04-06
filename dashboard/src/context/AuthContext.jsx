import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../Api';
import { setAccessToken } from '../Api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
let initialized = false;

export const AuthProvider = ({ children }) => {
  const[user, setUser] = useState(null);
  
  // NEW: Keep track of the currently selected store
  const [activeStore, setActiveStore] = useState(() => {
    const saved = sessionStorage.getItem('active_store');
    return saved ? JSON.parse(saved) : null;
  });
  
  const[loading, setLoading] = useState(true);

  // Sync activeStore to sessionStorage
  useEffect(() => {
    if (activeStore) {
      sessionStorage.setItem('active_store', JSON.stringify(activeStore));
    } else {
      sessionStorage.removeItem('active_store');
    }
  }, [activeStore]);

  useEffect(() => {
    if (initialized) return;
    initialized = true;
    
    const checkSession = async () => {
      const hasSession = localStorage.getItem('has_session');

      if (!hasSession) {
        setLoading(false);
        return; 
      }

      try {
        const res = await api.post('/users/refresh');
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch (error) {
        console.error("Session expired, logging out.");
        setUser(null);
        setActiveStore(null); // Clear active store on logout
        localStorage.removeItem('has_session');
      } finally {
        setLoading(false); 
      }
    };
    
    checkSession();
  },[]);

  const login = async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    
    setAccessToken(res.data.user.accessToken.token); 
    const userProfile = { ...res.data.user };
    delete userProfile.accessToken; 
    
    setUser(userProfile);
    localStorage.setItem('has_session', 'true'); 
  };

  // UPDATED: Now accepts userName instead of storeName
  const register = async (userName, email, password) => {
    const res = await api.post('/users/register', { userName, email, password });
    
    setAccessToken(res.data.user.accessToken.token); 
    const userProfile = { ...res.data.user };
    delete userProfile.accessToken; 
    
    setUser(userProfile);
    localStorage.setItem('has_session', 'true');
  };

  const logout = async () => {
    try {
      await api.post('/users/logout');
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setActiveStore(null); // Clear active store
      localStorage.removeItem('has_session');
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
    // Export activeStore and setActiveStore!
    <AuthContext.Provider value={{ user, activeStore, setActiveStore, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};