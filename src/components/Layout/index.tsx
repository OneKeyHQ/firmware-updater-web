import React from 'react';
import Header from '../Header';
import Footer from '../Footer';

export default function Layout({ children }: { children: React.ReactElement }) {
  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="h-auto min-h-96 rounded-sm  bg-white px-[10%]">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
