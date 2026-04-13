'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Trophy, ChevronRight, Hash } from 'lucide-react';
import Link from 'next/link';

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('event')
          .select(`
            *,
            entry(*) // 조건을 제거하고 전체 데이터를 가져옵니다.
          `)
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

  const formatKoreanDateTime = (dateString) => {
    if (!dateString) return '일정 미정';
    const cleanDate = dateString.replace('T', ' ').split('.')[0].slice(0, 16);
    const [datePart, timePart] = cleanDate.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    const week = ['일', '월', '화', '수', '목', '금', '토']; // 모바일을 위해 요일 단축
    const dayOfWeek = week[new Date(datePart).getDay()];
    return `${year}. ${month}. ${day}. (${dayOfWeek}) ${hour}:${minute}`;
  };

  const getPrizeData = (pay, count, ratios, frame) => {
    if (!pay || !count || !frame || frame === 0) return { prizes: [0, 0, 0], totalRemainder: 0 };
    const totalPool = pay * count;
    const perGamePool = totalPool / frame;
    const p1 = Math.floor((perGamePool * (ratios.r1 / 100)) / 1000) * 1000;
    const p2 = Math.floor((perGamePool * (ratios.r2 / 100)) / 1000) * 1000;
    const p3 = Math.floor((perGamePool * (ratios.r3 / 100)) / 1000) * 1000;
    const totalPrizePerGame = p1 + p2 + p3;
    const totalRemainder = totalPool - (totalPrizePerGame * frame);
    return { prizes: [p1, p2, p3], totalRemainder: totalRemainder };
  };

  if (loading) return <div className="p-10 text-center font-black text-slate-400 tracking-widest uppercase">Loading Events...</div>;

  return (
    <section className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6 font-sans">
      <div className="flex flex-col gap-1 mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic uppercase">대회 목록</h2>
        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em]">Upcoming & Past Events</p>
      </div>

      <div className="grid gap-4 md:gap-6">
        {events.length > 0 ? (
          events.map((event) => {
            const totalCount = event.entry?.length || 0;
            const confirmedCount = event.entry?.filter(e => 
                e.result === true && e.pay_person === true
              ).length || 0;
            const confirmedCount2 = event.entry?.filter(e => e.result === true).length || 0;
            const resultCount = event.entry?.filter(e => e.result === true).length || 0;
            const maxCount = event.max_people || 0; // DB 컬럼명에 맞춰 수정
            const isClosed = event.end;
            const paidCount = event.entry?.[0]?.count || 0;
            
            const { prizes, totalRemainder } = getPrizeData(
              event.event_pay_person, 
              confirmedCount, 
              { r1: event.ratio_1, r2: event.ratio_2, r3: event.ratio_3 }, 
              event.frame
            );

            return (
              <Link 
                key={event.event_id} 
                href={`/list/${event.event_id}`} 
                className={`group bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between hover:border-indigo-200 hover:shadow-md cursor-pointer ${
                  isClosed ? 'bg-slate-50/50' : '' 
                }`}
              >
                <div className="flex flex-col gap-4 md:gap-5 w-full">
                  {/* 상단 뱃지 및 날짜 영역 */}
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {isClosed ? (
                      <span className="bg-slate-200 text-slate-500 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">마감</span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">모집 중</span>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] md:text-[11px] font-bold">
                      <Calendar size={13} className="text-slate-300" />
                      <span>{formatKoreanDateTime(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] md:text-[11px] font-bold">
                      <Hash size={13} className="text-indigo-200" />
                      <span>{event.frame || 0}G</span>
                    </div>
                  </div>
                  
                  {/* 제목 영역 */}
                  <div>
                    <h3 className={`text-xl md:text-2xl font-black tracking-tight leading-tight transition-colors ${
                      isClosed ? 'text-slate-500' : 'text-slate-900 group-hover:text-indigo-600'
                    }`}>
                      {event.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {/* 전체 신청 현황 */}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        신청 <span className="text-slate-600">{totalCount}명</span>
                      </p>

                      {/* 확정 인원 / 최대 인원 (max_people 활용) */}
                      <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-600 uppercase">확정</span>
                        <p className="text-[11px] font-black text-emerald-700 tracking-tighter">
                          {confirmedCount2} <span className="text-emerald-300 mx-0.5">/</span> {maxCount}명
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 상금 정보 카드형 레이아웃 */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
                      <div className="flex items-center gap-1.5 bg-indigo-50/50 px-2.5 py-1.5 rounded-xl border border-indigo-100">
                        <span className="text-[9px] font-black text-indigo-400">1등</span>
                        <span className="text-xs md:text-sm font-black text-indigo-700">{prizes[0].toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-50/50 px-2.5 py-1.5 rounded-xl border border-purple-100">
                        <span className="text-[9px] font-black text-purple-400">2등</span>
                        <span className="text-xs md:text-sm font-black text-purple-700">{prizes[1].toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-400">3등</span>
                        <span className="text-xs md:text-sm font-black text-emerald-700">{prizes[2].toLocaleString()}원</span>
                      </div>
                      
                      {totalRemainder > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100">
                          <span className="text-[8px] font-black text-amber-500 uppercase italic">Rem</span>
                          <span className="text-[10px] font-bold text-amber-600 tracking-tight">{totalRemainder.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>

                    {/* 참가 비용 (모바일에서는 간격 조정) */}
                    <div className="flex gap-3 md:gap-4 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] md:text-[11px] font-bold">
                        <Trophy size={13} className="text-indigo-200" />
                        <span>개인 {event.event_pay_person?.toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] md:text-[11px] font-bold border-l border-slate-100 pl-3 md:pl-4">
                        <Trophy size={13} className="text-purple-200" />
                        <span>팀 {event.event_pay_team?.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 화살표 버튼: 모바일에서는 하단에 작게 배치되거나 숨길 수 있지만, 여기서는 우측 상단 정렬 느낌으로 유지 */}
                <div className="mt-4 md:mt-0 md:ml-4 self-end md:self-center p-3 md:p-4 rounded-xl md:rounded-2xl transition-all bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white">
                  <ChevronRight size={20} />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="bg-slate-50 p-12 md:p-20 rounded-[32px] md:rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-black tracking-tighter italic uppercase text-sm">No events found.</p>
          </div>
        )}
      </div>
    </section>
  );
}