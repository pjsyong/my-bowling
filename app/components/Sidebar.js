'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, List, User, Menu, X, UserPlus, Banknote } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // 카테고리별 메뉴 구조화
  const menuGroups = [
    {
      title: 'game',
      items: [
        { name: '수발이 기록', icon: <Trophy size={20} />, path: '/' },
        { name: '벙개 기록', icon: <Trophy size={20} />, path: '/person' },
        { name: '게임 목록', icon: <List size={20} />, path: '/list' },
      ]
    },
    {
      title: 'apply',
      items: [
        { name: '게임 신청', icon: <UserPlus size={20} />, path: '/invite' },
        { name: '입금 상태', icon: <Banknote size={20} />, path: '/money' },
      ]
    },
    {
      title: 'info',
      items: [
        { name: '개인 기록', icon: <User size={20} />, path: '/profile' },
        { name: '선수 등록', icon: <UserPlus size={20} />, path: '/register' },
      ]
    }
  ];

  return (
    <>
      {/* 상단 플로팅 햄버거 버튼 */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-5 left-5 z-[90] bg-white/80 backdrop-blur-md border border-gray-100 p-3 rounded-2xl shadow-lg text-slate-900"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 배경 흐림 처리 (오버레이) */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            {/* 사이드바 본체 */}
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed h-screen top-0 left-0 w-72 bg-white z-[110] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <h1 className="text-xl font-black italic tracking-tighter">IN-JEONG</h1>
                <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-50 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* 카테고리별 네비게이션 */}
              <nav className="flex-1 overflow-y-auto space-y-8">
                {menuGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                          <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
                            <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                              {item.icon}
                              <span className="font-bold text-base">{item.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* 하단 Admin Setting (기존 위치/폼 유지) */}
              <div className="pt-4 border-t border-gray-100">
                <Link href="/admin" onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-4 px-5 py-4 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                    <span className="text-xl">🔒</span>
                    <span className="font-bold">Admin Setting</span>
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