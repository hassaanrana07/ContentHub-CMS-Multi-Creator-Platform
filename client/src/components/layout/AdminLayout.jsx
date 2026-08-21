import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Users,
  FileStack,
  FolderTree,
  LogOut,
  Menu,
  X,
  Globe,
  BarChart3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Mail,
  SlidersHorizontal,
  Settings,
  Activity
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      group: 'CONTENTHUB ADMIN',
      items: [
        { name: 'Overview', path: '/admin', icon: ShieldAlert, end: true },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 }
      ]
    },
    {
      group: 'CREATOR MANAGEMENT',
      items: [
        { name: 'Creator Governance', path: '/admin/creators', icon: Users }
      ]
    },
    {
      group: 'CONTENT',
      items: [
        { name: 'Main Website (/)', path: '/admin/site', icon: Globe },
        { name: 'Platform Content', path: '/admin/content', icon: FileStack },
        { name: 'Global Categories', path: '/admin/categories', icon: FolderTree },
        { name: 'Media Library', path: '/admin/media', icon: ImageIcon }
      ]
    },
    {
      group: 'COMMUNICATION',
      items: [
        { name: 'Contact Messages', path: '/admin/messages', icon: Mail }
      ]
    },
    {
      group: 'PLATFORM',
      items: [
        { name: 'Navigation & Footer', path: '/admin/navigation', icon: SlidersHorizontal },
        { name: 'Site Settings', path: '/admin/settings', icon: Settings }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { name: 'Activity Log', path: '/admin/activity', icon: Activity }
      ]
    }
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-warm-black text-warm-bg p-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 font-serif font-bold text-lg text-warm-bg">
          <ShieldAlert className="w-5 h-5 text-warm-terracotta" />
          <span>Admin Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-warm-muted hover:text-warm-bg focus:outline-none"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Off-Canvas Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-warm-black/70 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* FIXED SIDEBAR - Clean Scrollbar & Overflow Protection */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-warm-black text-warm-bg flex flex-col justify-between transform transition-all duration-300 ease-in-out
        md:static md:translate-x-0 shrink-0 h-full overflow-x-hidden select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
        ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <Link to="/admin" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-warm-terracotta flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm shrink-0">
                A
              </div>
              {!collapsed && (
                <div className="truncate">
                  <span className="font-serif font-semibold text-base tracking-tight block text-white truncate">ContentHub</span>
                  <span className="text-[10px] text-warm-gold font-mono uppercase tracking-widest block truncate">Super Admin</span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="p-3 space-y-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1">
                {!collapsed && (
                  <h3 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-warm-gold/80 mb-1 truncate">
                    {grp.group}
                  </h3>
                )}
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors relative group overflow-hidden
                        ${isActive
                          ? 'bg-warm-terracotta text-white shadow-sm font-semibold'
                          : 'text-warm-bg/75 hover:bg-white/5 hover:text-white'}
                        ${collapsed ? 'justify-center' : ''}
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.name}</span>}

                      {/* Tooltip when collapsed */}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1 bg-warm-black text-white text-xs font-sans rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                          {item.name}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'Visit Main Website (/)' : undefined}
            className={`
              flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-warm-gold text-xs font-mono transition-all overflow-hidden
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            {!collapsed ? (
              <>
                <span>Visit Main Site (/)</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </>
            ) : (
              <ExternalLink className="w-4 h-4 shrink-0 text-warm-gold" />
            )}
          </a>

          <div className="flex items-center justify-between pt-1 px-1 text-xs text-warm-muted">
            {!collapsed && (
              <div className="truncate pr-2">
                <p className="font-semibold text-white text-xs truncate">{user?.name}</p>
                <p className="font-mono text-warm-gold text-[10px] truncate">ADMINISTRATOR</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-warm-muted hover:text-warm-terracotta hover:bg-white/10 rounded-lg transition-colors mx-auto md:mx-0 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN INDEPENDENTLY SCROLLABLE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-warm-surface border-b border-warm-border shrink-0">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warm-terracotta/10 text-warm-terracotta text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" /> Super Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-bg hover:bg-warm-hover text-warm-charcoal text-xs font-mono font-medium border border-warm-border transition-colors shadow-sm"
            >
              <span>Visit Main Website (/)</span>
              <ExternalLink className="w-3.5 h-3.5 text-warm-terracotta" />
            </a>
          </div>
        </header>

        {/* Page Body Outlet - Independent Scrolling */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
