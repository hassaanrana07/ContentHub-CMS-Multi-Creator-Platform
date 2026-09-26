import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts (Keep layouts static for immediate framing)
import { CreatorLayout } from './components/layout/CreatorLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Helper for lazy loading named exports
const lazyNamed = (importFn, name) =>
  React.lazy(() => importFn().then((m) => ({ default: m[name] })));

// Auth Pages (Lazy Loaded)
const Login = lazyNamed(() => import('./pages/auth/Login'), 'Login');
const Register = lazyNamed(() => import('./pages/auth/Register'), 'Register');

// Creator Pages (Lazy Loaded)
const CreatorOverview = lazyNamed(() => import('./pages/creator/Overview'), 'CreatorOverview');
const WebsiteBuilder = lazyNamed(() => import('./pages/creator/WebsiteBuilder'), 'WebsiteBuilder');
const CapabilitiesManager = lazyNamed(() => import('./pages/creator/CapabilitiesManager'), 'CapabilitiesManager');
const ArticleList = lazyNamed(() => import('./pages/creator/ArticleList'), 'ArticleList');
const CategoryManager = lazyNamed(() => import('./pages/creator/CategoryManager'), 'CategoryManager');
const MediaLibrary = lazyNamed(() => import('./pages/creator/MediaLibrary'), 'MediaLibrary');
const TestimonialsManager = lazyNamed(() => import('./pages/creator/TestimonialsManager'), 'TestimonialsManager');
const FaqManager = lazyNamed(() => import('./pages/creator/FaqManager'), 'FaqManager');
const ContactMessages = lazyNamed(() => import('./pages/creator/ContactMessages'), 'ContactMessages');
const WebsiteSettings = lazyNamed(() => import('./pages/creator/WebsiteSettings'), 'WebsiteSettings');
const ProfileSettings = lazyNamed(() => import('./pages/creator/ProfileSettings'), 'ProfileSettings');

// Admin Pages (Lazy Loaded)
const AdminOverview = lazyNamed(() => import('./pages/admin/AdminOverview'), 'AdminOverview');
const AdminAnalytics = lazyNamed(() => import('./pages/admin/AdminAnalytics'), 'AdminAnalytics');
const CreatorManagement = lazyNamed(() => import('./pages/admin/CreatorManagement'), 'CreatorManagement');
const AdminSiteManager = lazyNamed(() => import('./pages/admin/AdminSiteManager'), 'AdminSiteManager');
const PlatformContentManager = lazyNamed(() => import('./pages/admin/PlatformContentManager'), 'PlatformContentManager');
const PlatformCategoriesManager = lazyNamed(() => import('./pages/admin/PlatformCategoriesManager'), 'PlatformCategoriesManager');
const AdminMediaLibrary = lazyNamed(() => import('./pages/admin/AdminMediaLibrary'), 'AdminMediaLibrary');
const AdminMessages = lazyNamed(() => import('./pages/admin/AdminMessages'), 'AdminMessages');
const AdminNavigationManager = lazyNamed(() => import('./pages/admin/AdminNavigationManager'), 'AdminNavigationManager');
const AdminActivityLog = lazyNamed(() => import('./pages/admin/AdminActivityLog'), 'AdminActivityLog');

// Public Pages (Lazy Loaded)
const PublicCreatorSite = lazyNamed(() => import('./pages/public/PublicCreatorSite'), 'PublicCreatorSite');
const PublicArticleList = lazyNamed(() => import('./pages/public/PublicArticleList'), 'PublicArticleList');
const PublicArticleDetails = lazyNamed(() => import('./pages/public/PublicArticleDetails'), 'PublicArticleDetails');

// Elegant, accessible loading spinner
const PageLoader = () => (
  <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
    <div className="flex flex-col items-center gap-3 font-sans">
      <div className="w-8 h-8 border-2 border-warm-terracotta border-t-transparent rounded-full animate-spin"></div>
      <p className="font-serif text-sm font-medium text-warm-charcoal tracking-wide">Loading ContentHub...</p>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-serif font-semibold text-warm-charcoal">
        Verifying Session...
      </div>
    );
  }

  if (!user) {
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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
