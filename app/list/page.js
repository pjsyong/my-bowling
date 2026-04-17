'use client';

import React, { useState } from 'react'; // 1. useState 추가
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calendar, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';

export default function EventListPage() {
  // 현재 선택된 필터 상태 (기본값: 'WED')
  const [activeType, setActiveType] = useState('WED');

  // 2. queryKey에 activeType을 추가하여 상태 변경 시 자동으로 다시 페칭
  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ['events-list', activeType], 
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event')
        .select(`*, entry(*)`)
        .eq('event_type', activeType) // 선택된 타입만 필터링
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
  });

  const formatKoreanDateTime = (dateString) => {
    if (!dateString) return '일정 미정';
    const cleanDate = dateString.replace('T', ' ').split('.')[0].slice(0, 16);
    const [datePart, timePart] = cleanDate.split(' ');
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = week[new Date(datePart).getDay()];
    const [_, month, day] = datePart.split('-');
    return `${month}.${day} (${dayOfWeek}) ${timePart}`;
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-300 tracking-widest animate-pulse">LOADING...</div>;

  return (
    <section className="max-w-md mx-auto pt-16 pb-12 px-4"> {/* 모바일 여백 추가 */}
      {/* 헤더 영역 */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic uppercase leading-none mb-2">대회 목록</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Bowling Tournament List</p>
      </div>

      {/* 필터 탭 버튼 추가 */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveType('WED')}
          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
            activeType === 'WED' 
            ? 'bg-white text-indigo-600 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          수발이
        </button>
        <button
          onClick={() => setActiveType('RANK')}
          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
            activeType === 'RANK' 
            ? 'bg-white text-indigo-600 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          벙개
        </button>
      </div>

      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => {
            const confirmedCount = event.entry?.filter(e => e.result === true).length || 0;
            const maxCount = event.max_people || 0;
            const isClosed = event.end;

            return (
              <Link 
                key={event.event_id} 
                href={`/list/${event.event_id}`} 
                className="block group"
              >
                <div className={`relative overflow-hidden bg-white p-6 rounded-[32px] border transition-all active:scale-[0.98] ${
                  isClosed ? 'border-slate-100 opacity-70' : 'border-slate-50 shadow-sm shadow-slate-100 hover:border-indigo-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {isClosed ? (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">Closed</span>
                      ) : (
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg shadow-indigo-100">Live</span>
                      )}
                      <div className="flex items-center gap-1 text-slate-400 text-[11px] font-bold">
                        <Calendar size={12} />
                        <span>{formatKoreanDateTime(event.event_date)}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  
                  <div className="mb-4">
                    <h3 className={`text-lg font-black tracking-tight leading-tight ${
                      isClosed ? 'text-slate-500' : 'text-slate-900'
                    }`}>
                      {event.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-300" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-base font-black ${isClosed ? 'text-slate-400' : 'text-indigo-600'}`}>
                        {confirmedCount}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300 uppercase italic">/ {maxCount} Players</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
            <p className="text-slate-300 font-black italic uppercase text-xs">
              {activeType === 'WED' ? '수발이' : '벙개'} 내역이 없습니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}