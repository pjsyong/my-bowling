'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
// UserPlus 아이콘 추가
import { Trophy, List, User, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const width = isCollapsed ? '80px' : '256px';
    document.documentElement.style.setProperty('--sidebar-width', width);
  }, [isCollapsed]);

  // 메뉴 순서 조정: 개인 기록 바로 다음에 회원 등록 배치
  const menuItems = [
    { name: '대회 기록', icon: <Trophy size={18} />, path: '/dash' },
    { name: '대회 목록', icon: <List size={18} />, path: '/list' },
    { name: '개인 기록', icon: <User size={18} />, path: '/profile' },
    { name: '회원 등록', icon: <UserPlus size={18} />, path: '/register' }, // 여기에 위치
  ];

  const renderItem = (item, isBottom = false) => {
    const isActive = pathname === item.path;
    return (
      <Link key={item.path} href={item.path}>
        <div className={`relative w-full flex items-center gap-3 px-4 py-3 text-sm cursor-pointer group transition-all
          ${isCollapsed ? 'justify-center' : ''}`}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 bg-[#F5F5F7] rounded-full"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className={`relative z-10 transition-colors ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'}`}>
            {item.icon}
          </span>
          {!isCollapsed && (
            <span className={`relative z-10 whitespace-nowrap transition-colors ${isActive ? 'font-medium text-black' : 'text-gray-500 group-hover:text-black'}`}>
              {item.name}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside 
      className={`fixed h-screen top-0 left-0 bg-white border-r border-gray-100 py-12 flex flex-col transition-all duration-300 z-[100]
        ${isCollapsed ? 'w-20 px-2' : 'w-64 px-4'}`}
    >
      <button 
        onClick={(e) => {
          e.preventDefault();
          setIsCollapsed(!isCollapsed);
        }}
        className="absolute -right-3 top-10 bg-white border border-gray-100 rounded-full p-1.5 shadow-md hover:scale-110 transition-all text-gray-400 hover:text-black z-[110] flex items-center justify-center"
        aria-label="Toggle Sidebar"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`px-4 mb-16 transition-all duration-300 h-8 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        {isCollapsed ? (
          <span className="font-black text-xl italic text-slate-900">IN</span>
        ) : (
          <h1 className="text-xl font-medium tracking-tight uppercase whitespace-nowrap overflow-hidden">
            In-Jeong Bowling
          </h1>
        )}
      </div>

      {/* 상단 메뉴: 대회 기록 ~ 회원 등록 */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => renderItem(item))}
      </nav>

      {/* 하단 메뉴: 설정(🔒) 버튼 위치 유지 */}
      <div className="pt-4 border-t border-gray-50">
        {renderItem({ name: '설정', icon: <span className="text-[16px]">🔒</span>, path: '/admin' })}
      </div>
    </aside>
  );
}