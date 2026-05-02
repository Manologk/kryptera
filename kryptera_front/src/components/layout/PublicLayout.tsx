import Nav from '@/components/layout/Nav';
import ClientRouteGuard from '@/components/routing/ClientRouteGuard';
import ContactWidget from '@/components/ContactWidget';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 pb-[72px] lg:pb-0">
        <ClientRouteGuard />
      </main>
      <ContactWidget />
    </div>
  );
}
