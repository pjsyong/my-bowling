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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === 'injeong@gmail.com') {
        setIsAuth(true);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      if (data.user?.email === 'injeong@gmail.com') {
        setIsAuth(true);
      } else {
        await supabase.auth.signOut();
        alert('관리자 권한이 없는 계정입니다.');
      }
    } catch (error) {
      alert('로그인 실패: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-slate-300" size={40} />
      </div>
    );
  }

  // 인증 전: 로그인 화면 (모바일 전용 뷰)
  if (!isAuth) {
    return (
      <div className="max-w-md mx-auto flex items-center justify-center min-h-[85vh] px-6">
        <div className="w-full p-8 bg-white rounded-[40px] shadow-xl border border-slate-50 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-[22px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-200">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">Admin Access</h1>
          <p className="text-slate-400 text-[11px] mb-8 font-bold italic">관리자 계정으로 로그인하세요.</p>
          
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-sm"
                placeholder="Admin Email"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-sm"
                placeholder="Password"
                required
              />
            </div>
            <button 
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-4"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 인증 후: 메뉴 리스트 (모바일 전용 통합 UI)
  const menus = [
    { title: '대회 관리', desc: '대회 등록 및 종료 설정', icon: <Trophy size={20} />, color: 'bg-amber-50 text-amber-600', link: '/admin/events' },
    { title: '점수 관리', desc: '회원별 기록 입력 및 수정', icon: <LayoutGrid size={20} />, color: 'bg-blue-50 text-blue-600', link: '/admin/scores' },
    { title: '회원 관리', desc: '클럽 멤버 명단 관리', icon: <Users size={20} />, color: 'bg-emerald-50 text-emerald-600', link: '/admin/users' },
  ];

  return (
    <div className="max-w-md mx-auto pt-12 pb-24 px-6 min-h-screen bg-white font-sans">
      <div className="flex justify-between items-end mb-10">
        <header>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Settings</h1>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-2">Admin Dashboard</p>
        </header>
        <button 
          onClick={() => {
            supabase.auth.signOut();
            setIsAuth(false);
          }}
          className="text-[10px] font-black text-slate-400 border border-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors uppercase italic"
        >
          Logout
        </button>
      </div>

      <div className="space-y-4">
        {menus.map((m) => (
          <Link href={m.link} key={m.title} className="block group">
            <div className="flex items-center gap-4 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm active:scale-95 active:bg-slate-50 transition-all cursor-pointer">
              <div className={`w-12 h-12 ${m.color} rounded-[18px] flex items-center justify-center shadow-sm shrink-0`}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{m.title}</h3>
                <p className="text-slate-400 text-[11px] font-bold leading-tight line-clamp-1">{m.desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="mt-12 pt-8 border-t border-slate-50 text-center">
        <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em]">Subal Bowling Club System</p>
      </div>
    </div>
  );
}