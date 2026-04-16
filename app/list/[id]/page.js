'use client';

import React, { useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, Users2, Trophy, Target, Wallet, ShieldCheck, Clock, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { data: eventData, isLoading: loading } = useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      // 1. 대회 정보 가져오기
      const { data: eventInfo } = await supabase.from('event').select('*').eq('event_id', eventId).single();
      
      // 2. 참가 신청 데이터 가져오기
      const { data: entryData } = await supabase.from('entry').select('*').eq('event_id', eventId);

      let combinedEntries = [];
      if (entryData && entryData.length > 0) {
        const userIds = entryData.map(e => e.user_id);
        const { data: userData } = await supabase.from('user').select('user_id, name, type_pro').in('user_id', userIds);

        combinedEntries = entryData.map(entry => {
          const userInfo = userData?.find(u => u.user_id === entry.user_id);
          return {
            ...entry,
            user: userInfo,
            userName: userInfo ? userInfo.name : '이름 없음',
          };
        }).sort((a, b) => a.entry_id - b.entry_id);
      }

      return { eventInfo, entries: combinedEntries };
    },
    staleTime: 0, // 캐시를 즉시 보여주되 백그라운드에서 갱신
  });

  // 데이터 구조 분해 (기존 UI 변수명 유지)
  const eventInfo = eventData?.eventInfo || null;
  const entries = eventData?.entries || [];

  const calculatePrizes = () => {
    if (!eventInfo || !entries) return { prizes: [0, 0, 0], totalRemainder: 0 };
    // 확정된(result: true) 인원만 상금 계산에 포함
    const paidConfirmedEntries = entries.filter(e => e.result && e.pay_person);
    const totalPool = paidConfirmedEntries.length * eventInfo.event_pay_person;
    const frame = eventInfo.frame || 1;
    const perGamePool = totalPool / frame;
    
    const p1 = Math.floor((perGamePool * (eventInfo.ratio_1 / 100)) / 1000) * 1000;
    const p2 = Math.floor((perGamePool * (eventInfo.ratio_2 / 100)) / 1000) * 1000;
    const p3 = Math.floor((perGamePool * (eventInfo.ratio_3 / 100)) / 1000) * 1000;
    
    const totalPrizePerGame = p1 + p2 + p3;
    const totalRemainder = totalPool - (totalPrizePerGame * frame);

    return { prizes: [p1, p2, p3], totalRemainder };
  };

  const { prizes, totalRemainder } = calculatePrizes();
  const confirmedCount = entries.filter(entry => entry.result).length;

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse italic text-sm tracking-widest">LOADING...</div>;
  if (!eventInfo) return <div className="p-20 text-center text-slate-400">정보를 불러올 수 없습니다.</div>;

  return (
    <section className="max-w-md mx-auto pt-10 pb-24 px-5 font-sans bg-white min-h-screen">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/list" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest transition-colors hover:text-indigo-600">
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-black px-3 py-0.5 rounded-full tracking-tighter ${eventInfo.end ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}>
            {eventInfo.end ? 'CLOSED' : 'LIVE'}
          </span>
          <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5 italic">
            <Calendar size={13} className="text-slate-300" /> {eventInfo.event_date?.split('T')[0]}
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 leading-tight italic uppercase tracking-tighter">
          {eventInfo.title}
        </h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px]">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Users2 size={14}/>
            <span className="text-[10px] font-black uppercase tracking-wider">Confirmed</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{confirmedCount}</span>
            <span className="text-[11px] font-bold text-slate-400 italic">/ {eventInfo.max_people}</span>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px]">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Target size={14}/>
            <span className="text-[10px] font-black uppercase tracking-wider">Game Frame</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{eventInfo.frame}</span>
            <span className="text-[11px] font-bold text-slate-400 italic">Sets</span>
          </div>
        </div>
      </div>

      {/* Prize & Fee Cards */}
      <div className="mb-10 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <div className="min-w-[260px] bg-slate-900 rounded-[32px] p-6 text-white">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2 opacity-50">
              <Trophy size={14}/>
              <span className="text-[10px] font-black uppercase tracking-widest">Est. Prize</span>
            </div>
            {totalRemainder > 0 && <span className="text-[9px] font-bold text-amber-400 px-2 py-0.5 border border-amber-400/30 rounded-full">+{totalRemainder.toLocaleString()}</span>}
          </div>
          <div className="flex justify-between items-center px-2">
            <div className="text-center">
              <span className="block text-lg mb-1">🥇</span>
              <span className="text-sm font-black tracking-tighter">{prizes[0].toLocaleString()}</span>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="text-center">
              <span className="block text-lg mb-1">🥈</span>
              <span className="text-sm font-black tracking-tighter">{prizes[1].toLocaleString()}</span>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="text-center">
              <span className="block text-lg mb-1">🥉</span>
              <span className="text-sm font-black tracking-tighter">{prizes[2].toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="min-w-[160px] bg-indigo-50 border border-indigo-100 rounded-[32px] p-6">
          <div className="flex items-center gap-2 mb-5 text-indigo-400">
            <Wallet size={14}/>
            <span className="text-[10px] font-black uppercase tracking-widest">Entry Fee</span>
          </div>
          <div className="space-y-1">
            <p className="flex justify-between text-[11px] font-bold text-indigo-900"><span>Solo</span> <span>{eventInfo.event_pay_person?.toLocaleString()}</span></p>
            <p className="flex justify-between text-[11px] font-bold text-indigo-900"><span>Team</span> <span>{eventInfo.event_pay_team?.toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      {/* Participant List */}
      <div>
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Entry List</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
              {entries.length - confirmedCount} Waiting
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => {
            // result가 false이면 신청 대기 상태
            const isWaiting = !entry.result;

            return (
              <div 
                key={entry.entry_id} 
                className={`flex items-center justify-between p-4 rounded-[24px] border transition-all
                  ${isWaiting 
                    ? 'bg-slate-50/40 border-dashed border-slate-200 opacity-75' 
                    : 'bg-white border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black italic ${isWaiting ? 'text-slate-300' : 'text-indigo-600'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[15px] font-black tracking-tight ${isWaiting ? 'text-slate-400' : 'text-slate-800'}`}>
                        {entry.userName || 'Unknown'}
                      </p>
                      
                      {entry.user?.type_pro === 1 && (
                        <span className="flex items-center gap-0.5 bg-slate-900 text-white text-[7px] px-1.5 py-0.5 rounded font-black italic">
                           <ShieldCheck size={8} className="text-blue-400" /> PRO
                        </span>
                      )}

                      {isWaiting && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          <Clock size={8} /> Waiting
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {entry.pay_team && <span className="text-[8px] font-black text-purple-400 uppercase border border-purple-100 px-1 rounded">Team</span>}
                      {entry.pay_person && <span className="text-[8px] font-black text-indigo-400 uppercase border border-indigo-100 px-1 rounded">Solo</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-[13px] font-black italic tracking-tighter mb-1 ${isWaiting ? 'text-slate-400' : 'text-slate-900'}`}>
                    {entry.payment_amount?.toLocaleString()}원
                  </p>
                  <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${entry.payment_status ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                    {entry.payment_status ? 'PAID' : 'UNPAID'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}