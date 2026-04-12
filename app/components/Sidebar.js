'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, List, User } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: '대회 기록', icon: <Trophy size={18} />, path: '/' },
    { name: '대회 목록', icon: <List size={18} />, path: '/list' },
    { name: '개인 기록', icon: <User size={18} />, path: '/profile' },
    { name: '설정', path: '/admin', icon: '🔒' },
  ];

  return (
    <aside className="fixed h-screen w-64 bg-white border-r border-gray-100 px-4 py-12 flex flex-col">
      <div className="px-4 mb-16">
        <h1 className="text-xl font-medium tracking-tight uppercase">Subal Bowl</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div className="relative w-full flex items-center gap-3 px-4 py-3 text-sm cursor-pointer group">
              {pathname === item.path && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[#F5F5F7] rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${pathname === item.path ? 'text-black' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 ${pathname === item.path ? 'font-medium text-black' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}