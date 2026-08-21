import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { CreatorLayout } from './components/layout/CreatorLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Creator Pages
import { CreatorOverview } from './pages/creator/Overview';
import { WebsiteBuilder } from './pages/creator/WebsiteBuilder';
import { CapabilitiesManager } from './pages/creator/CapabilitiesManager';
import { ArticleList } from './pages/creator/ArticleList';
import { CategoryManager } from './pages/creator/CategoryManager';
import { MediaLibrary } from './pages/creator/MediaLibrary';
import { TestimonialsManager } from './pages/creator/TestimonialsManager';
import { FaqManager } from './pages/creator/FaqManager';
import { ContactMessages } from './pages/creator/ContactMessages';
import { WebsiteSettings } from './pages/creator/WebsiteSettings';
import { ProfileSettings } from './pages/creator/ProfileSettings';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { CreatorManagement } from './pages/admin/CreatorManagement';
import { AdminSiteManager } from './pages/admin/AdminSiteManager';
import { PlatformContentManager } from './pages/admin/PlatformContentManager';
import { PlatformCategoriesManager } from './pages/admin/PlatformCategoriesManager';
import { AdminMediaLibrary } from './pages/admin/AdminMediaLibrary';
import { AdminMessages } from './pages/admin/AdminMessages';
import { AdminNavigationManager } from './pages/admin/AdminNavigationManager';
import { AdminActivityLog } from './pages/admin/AdminActivityLog';

// Public Pages
import { PublicCreatorSite } from './pages/public/PublicCreatorSite';
import { PublicArticleList } from './pages/public/PublicArticleList';
import { PublicArticleDetails } from './pages/public/PublicArticleDetails';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-serif font-semibold text-warm-charcoal">
        Verifying Session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* STATIC / RESERVED SYSTEM ROUTES (Priority 1) */}
          <Route path="/" element={<PublicCreatorSite />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/articles" element={<PublicArticleList />} />
          <Route path="/articles/:slug" element={<PublicArticleDetails />} />

          {/* Protected Creator Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="CREATOR">
                <CreatorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CreatorOverview />} />
            <Route path="builder" element={<WebsiteBuilder />} />
            <Route path="capabilities" element={<CapabilitiesManager />} />
            <Route path="articles" element={<ArticleList />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="testimonials" element={<TestimonialsManager />} />
            <Route path="faqs" element={<FaqManager />} />
            <Route path="messages" element={<ContactMessages />} />
            <Route path="settings" element={<WebsiteSettings />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Protected Super Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="creators" element={<CreatorManagement />} />
            <Route path="site" element={<AdminSiteManager />} />
            <Route path="content" element={<PlatformContentManager />} />
            <Route path="categories" element={<PlatformCategoriesManager />} />
            <Route path="media" element={<AdminMediaLibrary />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="navigation" element={<AdminNavigationManager />} />
            <Route path="settings" element={<AdminSiteManager />} />
            <Route path="activity" element={<AdminActivityLog />} />
          </Route>

          {/* DYNAMIC CREATOR PUBLIC WEBSITE ROUTES (Priority 2) */}
          <Route path="/:username" element={<PublicCreatorSite />} />
          <Route path="/:username/articles" element={<PublicArticleList />} />
          <Route path="/:username/articles/:slug" element={<PublicArticleDetails />} />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
