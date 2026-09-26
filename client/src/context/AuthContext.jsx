import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Ensure all cross-origin and same-origin Axios requests include HttpOnly cookies
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial session verification on application mount
  useEffect(() => {
    // Migration safeguard: remove any legacy token from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('contenthub_token');
    }
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      setCreator(res.data.creator);
    } catch (err) {
      setUser(null);
      setCreator(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const res = await axios.post('/api/auth/login', {
      identifier,
      password,
      email: identifier,
      username: identifier
    });
    const { user: userData, creator: creatorData } = res.data;
    setUser(userData);
    setCreator(creatorData);
    return res.data;
  };

  const register = async (formData) => {
    const res = await axios.post('/api/auth/register', formData);
    // DO NOT automatically set token or authenticate session
    return res.data;
  };

  const logout = async () => {
    try {
      // Server-side logout revokes JWT in blocklist and clears the HttpOnly cookie
      await axios.post('/api/auth/logout', null, { timeout: 4000 });
    } catch (err) {
      console.warn('Server logout revocation notice:', err?.response?.data?.error || err?.message);
    } finally {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('contenthub_token');
      }
      setUser(null);
      setCreator(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        creator,
        token: !!user,
        loading,
        login,
        register,
        logout,
        fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
