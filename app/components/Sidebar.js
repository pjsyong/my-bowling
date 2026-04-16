'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, List, User, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false); // Collapsed 대신 Open 상태로 관리

  // 사이드바가 열려있을 때 본문 스크롤 방지 (선택 사항)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const menuItems = [
    { name: '대회 기록', icon: <Trophy size={18} />, path: '/' },
    { name: '대회 목록', icon: <List size={18} />, path: '/list' },
    { name: '개인 기록', icon: <User size={18} />, path: '/profile' },
    { name: '회원 등록', icon: <UserPlus size={18} />, path: '/register' },
  ];

  const renderItem = (item) => {
    const isActive = pathname === item.path;
    return (
      <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
        <div className={`relative w-full flex items-center gap-4 px-5 py-4 text-sm cursor-pointer group transition-all`}>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-y-2 inset-x-2 bg-blue-50 rounded-2xl"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className={`relative z-10 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
            {item.icon}
          </span>
          <span className={`relative z-10 font-bold transition-colors ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
            {item.name}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* 1. 토글 버튼 (고정 위치) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-4 z-[110] bg-white border border-slate-100 rounded-2xl p-3 shadow-lg text-slate-600"
      >
        {isOpen ? <ChevronLeft size={20} /> : <List size={20} />}
      </button>

      {/* 2. 배경 어둡게 처리 (Overlay Backdrop) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
          />
        )}
      </AnimatePresence>

      {/* 3. 사이드바 본체 (UI 위를 지나감) */}
      <aside 
        className={`fixed h-[calc(100dvh-32px)] top-4 left-4 bg-white border border-slate-100 rounded-[32px] py-12 flex flex-col transition-all duration-500 z-[100] shadow-2xl
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-[120%] w-64'}`}
      >
        <div className="px-8 mb-10 h-8 flex items-center">
          <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
            In-Jeong 🎳
          </h1>
        </div>

        <nav className="flex-1 px-2">
          {menuItems.map((item) => renderItem(item))}
        </nav>

        <div className="pt-4 px-2 border-t border-gray-50">
          {renderItem({ name: '설정', icon: <span className="text-[16px]">🔒</span>, path: '/admin' })}
        </div>
      </aside>
    </>
  );
}