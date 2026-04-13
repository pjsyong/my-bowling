'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Trophy, Users, LayoutGrid, ChevronRight, Mail, LogIn, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true); // 초기 권한 확인 중 로딩
  const [isSubmitting, setIsSubmitting] = useState(false); // 로그인 버튼 로딩
  const router = useRouter();
  
  // 1. 페이지 접속 시 세션 체크
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 로그인한 유저가 관리자 이메일과 일치하는지 확인
      if (user && user.email === 'injeong@gmail.com') {
        setIsAuth(true);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // 2. 로그인 핸들러
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      // 로그인 성공 시 관리자 여부 한 번 더 검증
      if (data.user?.email === 'injeong@gmail.com') {
        setIsAuth(true);
      } else {
        // 관리자가 아닌 계정으로 로그인 시 강제 로그아웃
        await supabase.auth.signOut();
        alert('관리자 권한이 없는 계정입니다.');
      }
    } catch (error) {
      alert('로그인 실패: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 초기 권한 확인 로딩 중
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-slate-300" size={40} />
      </div>
    );
  }

  // 인증 전: 로그인 화면
  if (!isAuth) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-md p-8 md:p-10 bg-white rounded-[40px] shadow-2xl border border-gray-50 text-center">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium italic">관리자 계정으로 로그인하세요.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                placeholder="Admin Email"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                placeholder="Password"
                required
              />
            </div>
            <button 
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              접속하기
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
      <div className="flex justify-between items-start mb-12">
        <header>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">System Settings</h1>
          <p className="text-slate-400 font-medium mt-2">수발 볼링 클럽 관리 시스템입니다.</p>
        </header>
        <button 
          onClick={() => {
            supabase.auth.signOut();
            setIsAuth(false);
          }}
          className="text-[10px] font-black text-slate-400 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors uppercase"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menus.map((m) => (
          <Link href={m.link} key={m.title}>
            <div className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col">
              <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                {m.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{m.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{m.desc}</p>
              
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