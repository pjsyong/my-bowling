'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // event_date 기준 내림차순(최신순) 정렬
        const { data, error } = await supabase
          .from('event')
          .select('*')
          .order('event_date', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) return <div className="p-10 text-center font-black text-slate-400 tracking-widest">LOADING...</div>;

  return (
    <section className="max-w-5xl mx-auto py-12 px-6 font-sans">
      <div className="flex flex-col gap-2 mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">대회 목록</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Upcoming & Past Events</p>
      </div>

      <div className="grid gap-6">
        {events.length > 0 ? (
          events.map((event) => {
            const isClosed = event.end;

            return (
              <Link 
                key={event.event_id} 
                // ✅ 이 부분이 중요합니다! 상세 페이지 경로와 일치해야 합니다.
                href={isClosed ? '#' : `/list/${event.event_id}`} 
                onClick={(e) => {
                  if (isClosed) {
                    e.preventDefault();
                    alert('이미 마감된 대회입니다. 현황만 확인하시겠습니까? (기능 준비 중)');
                  }
                }}
                className={`group bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 transition-all flex items-center justify-between ${
                  isClosed 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:border-indigo-200 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    {isClosed ? (
                      <span className="bg-slate-200 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                        마감
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                        모집 중
                      </span>
                    )}
                    
                    <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-300" />
                      <span className="mt-0.5">진행일: {event.event_date || '일정 미정'}</span>
                    </p>
                  </div>
                  
                  <h3 className={`text-2xl font-black tracking-tight transition-colors ${
                    isClosed ? 'text-slate-400' : 'text-slate-900 group-hover:text-indigo-600'
                  }`}>
                    {event.title}
                  </h3>

                  <div className="flex gap-5 items-center text-slate-400 text-sm font-bold">
                    <div className="flex items-center gap-1.5">
                      <Trophy size={16} className={isClosed ? 'text-slate-200' : 'text-indigo-200'} />
                      <span>개인 {event.event_pay_person?.toLocaleString() || 0}원</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={16} className={isClosed ? 'text-slate-200' : 'text-purple-200'} />
                      <span>팀전 {event.event_pay_team?.toLocaleString() || 0}원</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl transition-all ${
                  isClosed 
                    ? 'bg-slate-50 text-slate-200' 
                    : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                }`}>
                  <ChevronRight size={24} />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="bg-slate-50 p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-black tracking-tighter italic">현재 등록된 대회가 없습니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}