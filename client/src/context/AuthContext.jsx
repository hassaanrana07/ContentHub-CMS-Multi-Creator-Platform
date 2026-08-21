import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [creator, setCreator] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('contenthub_token') || null);
  const [loading, setLoading] = useState(true);

  // Set default axios Authorization header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setCreator(null);
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      setCreator(res.data.creator);
    } catch (err) {
      console.error('Failed to verify session token:', err.response?.data?.error || err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const res = await axios.post('/api/auth/login', { identifier, password, email: identifier, username: identifier });
    const { token: jwtToken, user: userData, creator: creatorData } = res.data;
    localStorage.setItem('contenthub_token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
    setCreator(creatorData);
    return res.data;
  };

  const register = async (formData) => {
    const res = await axios.post('/api/auth/register', formData);
    // DO NOT automatically set token or authenticate session
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('contenthub_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setCreator(null);
  };

  return (
    <AuthContext.Provider value={{ user, creator, token, loading, login, register, logout, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
