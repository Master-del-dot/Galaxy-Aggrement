import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/' },
    { name: 'Setup', icon: 'settings_suggest', path: '/setup' },
    { name: 'Fill Form', icon: 'edit_note', path: '/fill-form' },
    { name: 'PDFs', icon: 'picture_as_pdf', path: '/library' },
    { name: 'Edit PDF', icon: 'edit_document', path: '/edit-pdf' },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-md shadow-sm border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button className="text-primary p-2 hover:bg-primary-container/20 rounded-full transition-all flex items-center justify-center">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="font-headline font-bold tracking-tight text-lg text-primary">Galaxy Automator</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-primary-container/20 hover:text-primary'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shadow-sm">
            <span className="material-symbols-outlined">account_circle</span>
          </div>
        </div>
      </header>

      <div className="flex-grow pt-24 pb-32">
        {children}
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-3 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl overflow-x-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.name} to={item.path} className={cn(
              'flex flex-col items-center justify-center px-3 py-2 hover:text-primary transition-all active:scale-95 duration-200 ease-in-out min-w-[68px]',
              isActive ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary rounded-2xl scale-105' : 'text-on-surface-variant'
            )}>
              <span className={cn('material-symbols-outlined mb-1', isActive && 'fill')}>{item.icon}</span>
              <span className="font-label font-medium text-[10px] uppercase tracking-wider text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
