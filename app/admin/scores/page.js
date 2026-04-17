'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'; // 2. 추가
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, ChevronRight, Trophy, Target
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScoreManagementHub() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = React.useState('ALL'); // 'ALL', 'WED', 'RANK'

  // 3. React Query로 대회 목록 호출
  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ['admin-score-events'],
    queryFn: async () => {
      const { data: eventData, error: eventError } = await supabase
        .from('event')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (eventError) throw eventError;
      return eventData || [];
    },
    staleTime: 0, // 항상 최신 목록을 확인하도록 설정
  });

  const filteredEvents = events.filter(event => 
    activeFilter === 'ALL' ? true : event.event_type === activeFilter
  );

  // 4. 권한 체크 전용 useEffect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'injeong@gmail.com') {
        alert('관리자 인증이 필요합니다.');
        router.push('/admin');
      }
    };
    checkAuth();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 tracking-widest animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 truncate uppercase italic tracking-tight">Score Control</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">대회를 선택하여 점수를 관리하세요</p>
          </div>
        </div>
      </div>

      {/* Event List Container */}
      <div className="max-w-xl mx-auto p-4 space-y-5">
        <div className="flex bg-white/50 p-1.5 rounded-[24px] border border-slate-100 gap-1 mb-2">
          {[
            { id: 'ALL', label: '전체' },
            { id: 'WED', label: '수발이' },
            { id: 'RANK', label: '랭킹전' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 py-3 rounded-[20px] text-xs font-black transition-all ${
                activeFilter === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm shadow-blue-100' 
                  : 'text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {filteredEvents.map((event) => (
          <Link 
            href={`/admin/scores/${event.event_id}`} 
            key={event.event_id}
            className="block" // 이 부분이 핵심입니다! block을 줘야 space-y가 작동합니다.
          >
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md active:scale-[0.97] transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4 min-w-0">
                {/* 아이콘 영역 */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  event.event_type === 'WED' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'
                }`}>
                  {event.event_type === 'WED' ? <Trophy size={20} /> : <Target size={20} />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                      event.event_type === 'WED' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {event.event_type === 'WED' ? 'SU-BAL-I' : 'RANKING'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(event.event_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h3>
                </div>
              </div>

              <div className="text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0 ml-4">
                <ChevronRight size={20} />
              </div>
            </div>
          </Link>
        ))}
        {filteredEvents.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-bold text-sm">
            해당 카테고리의 대회가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}