import { Outlet } from 'react-router-dom';
import Nav from '@/components/layout/Nav';
import ContactWidget from '@/components/ContactWidget';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 pb-[72px] lg:pb-0">
        <Outlet />
      </main>
      <ContactWidget />
    </div>
  );
}
