'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, List, User, Menu, X, UserPlus, Lock } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: '대회 기록', icon: <Trophy size={20} />, path: '/' },
    { name: '대회 목록', icon: <List size={20} />, path: '/list' },
    { name: '개인 기록', icon: <User size={20} />, path: '/profile' },
    { name: '회원 등록', icon: <UserPlus size={20} />, path: '/register' },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* 모바일 상단 플로팅 햄버거 버튼 */}
      <button 
        onClick={toggleSidebar}
        className="fixed top-5 left-5 z-[110] p-3 bg-white rounded-2xl shadow-lg border border-gray-100 text-slate-800"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 뒷배경 흐리게 (Overlay) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]"
            />

            {/* 사이드바 본체 */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-white z-[130] shadow-2xl p-6 flex flex-col"
            >
              <div className="mt-16 mb-10 px-2">
                <h1 className="text-2xl font-black italic tracking-tighter text-slate-900">
                  IN-JEONG <span className="text-blue-600">.</span>
                </h1>
              </div>

              <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                  <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
                    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                      pathname === item.path ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                    }`}>
                      {item.icon}
                      <span className="font-bold">{item.name}</span>
                    </div>
                  </Link>
                ))}
              </nav>

              <div className="pt-6 border-t border-gray-100">
                <Link href="/admin" onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-4 px-5 py-4 text-slate-400">
                    <Lock size={20} />
                    <span className="font-medium">관리자 설정</span>
                  </div>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}