'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Trophy, Users, LayoutGrid, ChevronRight } from 'lucide-react';
import Link from 'next/link'; // ← 반드시 있어야 합니다!

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);

  // 1. 세션 체크: 한 번 로그인하면 탭을 닫기 전까지 유지
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') {
      setIsAuth(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234') { // 실제 사용하실 비밀번호로 변경 가능
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuth(true);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
      setPassword('');
    }
  };

  // 인증 전: 로그인 화면
  if (!isAuth) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-sm p-10 bg-white rounded-[40px] shadow-2xl border border-gray-50 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-slate-800" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium">관리자 비밀번호를 입력하세요.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-center font-bold tracking-widest"
              placeholder="••••"
            />
            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
              인증하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 인증 후: 메뉴 리스트
  const menus = [
    { title: '대회 관리', desc: '새 대회 등록 및 종료 설정', icon: <Trophy />, color: 'bg-amber-50 text-amber-600', link: '/admin/events' },
    { title: '점수 관리', desc: '회원별 기록 입력 및 수정', icon: <LayoutGrid />, color: 'bg-blue-50 text-blue-600', link: '/admin/scores' },
    { title: '회원 관리', desc: '클럽 멤버 명단 관리', icon: <Users />, color: 'bg-emerald-50 text-emerald-600', link: '/admin/users' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">System Settings</h1>
        <p className="text-slate-400 font-medium mt-2">수발 볼링 클럽 관리 시스템입니다.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menus.map((m) => (
          <Link href={m.link} key={m.title}>
            <div className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col">
              <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {m.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{m.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{m.desc}</p>
              
              {/* 아래쪽 화살표 영역 */}
              <div className="mt-auto pt-8 flex items-center text-xs font-bold text-slate-300 group-hover:text-slate-900 transition-colors">
                관리하기 <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}