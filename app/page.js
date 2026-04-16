'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, ChevronDown, Wallet, List, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MobileOptimizedPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking');

  useEffect(() => {
    async function initData() {
      const { data: eventData } = await supabase
        .from('event')
        .select('*')
        .order('event_date', { ascending: false });
      
      setEvents(eventData || []);
      const activeEvent = eventData?.find(e => e.progress === true) || eventData?.[0];
      if (activeEvent) setSelectedEventId(activeEvent.event_id);
      setLoading(false);
    }
    initData();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchRankings(selectedEventId);
  }, [selectedEventId]);

  async function fetchRankings(eventId) {
    const { data: entryData } = await supabase
      .from('entry')
      .select('*, user:user_public!user_id(name)')
      .eq('event_id', eventId);
    const { data: scoreData } = await supabase
      .from('score')
      .select('*')
      .eq('event_id', eventId);

    const combined = entryData?.map(entry => {
      const s = scoreData?.find(score => score.user_id === entry.user_id) || {};
      const scores = [s.game_1 || 0, s.game_2 || 0, s.game_3 || 0, s.game_4 || 0, s.game_5 || 0];
      const total = scores.reduce((a, b) => a + b, 0);
      return { ...entry, total, avg: (total / 5).toFixed(1), scores };
    })
    .filter(entry => entry.result === true)
    .sort((a, b) => b.total - a.total);

    setRankings(combined || []);
  }

  const selectedEvent = events.find(e => e.event_id === selectedEventId);

  // 상금 계산 로직을 함수로 분리
  const getPrizeCalculation = () => {
    const pay = selectedEvent?.event_pay_person || 0;
    const confirmedCount = rankings.filter(r => r.pay_person).length;
    const frame = selectedEvent?.frame || 0;
    const ratios = { r1: selectedEvent?.ratio_1 || 0, r2: selectedEvent?.ratio_2 || 0, r3: selectedEvent?.ratio_3 || 0 };

    if (!pay || !confirmedCount || !frame) return { prizes: [0, 0, 0], totalRemainder: 0, totalPool: 0, count: 0 };
    
    const totalPool = pay * confirmedCount;
    const perGamePool = totalPool / frame;
    const p1 = Math.floor((perGamePool * (ratios.r1 / 100)) / 1000) * 1000;
    const p2 = Math.floor((perGamePool * (ratios.r2 / 100)) / 1000) * 1000;
    const p3 = Math.floor((perGamePool * (ratios.r3 / 100)) / 1000) * 1000;
    const totalRemainder = totalPool - ((p1 + p2 + p3) * frame);
    
    return { prizes: [p1, p2, p3], totalRemainder, totalPool, count: confirmedCount };
  };

  const calculateWinners = (prizes) => {
    const winnerMap = {};
    for (let i = 0; i < (selectedEvent?.frame || 0); i++) {
      const gameRanking = [...rankings]
        .map(r => ({ name: r.user?.name, score: r.scores[i] || 0 }))
        .sort((a, b) => b.score - a.score);
      [0, 1, 2].forEach(rank => {
        const winner = gameRanking[rank];
        if (winner && winner.score > 0) {
          winnerMap[winner.name] = (winnerMap[winner.name] || 0) + prizes[rank];
        }
      });
    }
    return Object.entries(winnerMap)
      .map(([name, totalPrize]) => ({ name, totalPrize }))
      .sort((a, b) => b.totalPrize - a.totalPrize);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#F2F4F7] text-slate-400 font-bold">로딩 중...</div>;

  const prizeInfo = getPrizeCalculation();
  const winnersList = calculateWinners(prizeInfo.prizes);

  return (
    <div className="bg-[#F2F4F7] min-h-screen pb-20 overflow-x-hidden">
      {/* --- 상단 고정 헤더 --- */}
      <div className="bg-white px-4 pt-6 pb-2 sticky top-0 z-40 border-b border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">IN-JEONG 🎳</h1>
          <button 
            onClick={() => setIsDropdownOpen(true)}
            className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 active:scale-95"
          >
            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[100px]">{selectedEvent?.title}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'ranking' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
          >
            <List size={15} /> 순위/기록
          </button>
          <button 
            onClick={() => setActiveTab('prize')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'prize' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
          >
            <Wallet size={15} /> 상금 정산
          </button>
        </div>
      </div>

      <div className="px-3 pt-4 max-w-md mx-auto">
        {activeTab === 'ranking' ? (
          <div className="space-y-3">
            {/* 요약 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-white">
                <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">참가 인원</p>
                <p className="text-lg font-black text-slate-800">{rankings.length}명</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-white">
                <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">최고 점수</p>
                <p className="text-lg font-black text-blue-600">{rankings[0]?.total || 0}</p>
              </div>
            </div>

            {/* 랭킹 리스트 */}
            {rankings.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
                <div className="flex items-center px-4 py-4 gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 
                    ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-50 text-orange-600' : 'text-slate-200'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-[15px]">{p.user?.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">Avg {p.avg}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">{p.total}</span>
                  </div>
                </div>
                {/* 5게임 점수 - 화면에 딱 맞게 등분 */}
                <div className="grid grid-cols-5 bg-slate-50/50 border-t border-slate-50 divide-x divide-slate-100">
                  {p.scores.map((score, idx) => (
                    <div key={idx} className="py-2.5 text-center">
                      <p className="text-[8px] font-bold text-slate-300 mb-0.5">G{idx+1}</p>
                      <p className={`text-[12px] font-black ${score >= 200 ? 'text-red-500' : 'text-slate-600'}`}>
                        {score || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 상금 정산 탭 */
          <div className="space-y-4">
            <div className="bg-blue-600 rounded-[28px] p-6 text-white shadow-lg">
              <p className="text-[11px] font-medium opacity-80 mb-1">총 사이드 금액 (확정 {prizeInfo.count}명)</p>
              <h3 className="text-3xl font-black">{prizeInfo.totalPool.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></h3>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                <div className="text-center"><p className="text-[9px] opacity-60 mb-0.5">1등 상금</p><p className="text-xs font-bold">{prizeInfo.prizes[0].toLocaleString()}</p></div>
                <div className="text-center"><p className="text-[9px] opacity-60 mb-0.5">2등 상금</p><p className="text-xs font-bold">{prizeInfo.prizes[1].toLocaleString()}</p></div>
                <div className="text-center"><p className="text-[9px] opacity-60 mb-0.5">3등 상금</p><p className="text-xs font-bold">{prizeInfo.prizes[2].toLocaleString()}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><Award size={16} className="text-blue-500"/> 최종 수령자</h4>
                <span className="text-[10px] text-slate-400 font-bold">잔액 {prizeInfo.totalRemainder.toLocaleString()}원</span>
              </div>
              <div className="space-y-2">
                {winnersList.map((w, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="font-bold text-slate-700 text-sm">{w.name}</span>
                    <span className="font-black text-blue-600 text-base">{w.totalPrize.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이벤트 선택 바텀 시트 */}
      <AnimatePresence>
        {isDropdownOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDropdownOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed bottom-0 inset-x-0 bg-white rounded-t-[32px] z-[60] p-6 pb-10 shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-black text-slate-900 mb-4">대회 회차 선택</h2>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {events.map((ev) => (
                  <button key={ev.event_id} onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedEventId === ev.event_id ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-transparent'} border`}>
                    <p className={`font-bold text-sm ${selectedEventId === ev.event_id ? 'text-blue-600' : 'text-slate-700'}`}>{ev.title}</p>
                    <p className="text-[10px] text-slate-400">{ev.event_date}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}