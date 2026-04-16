'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Calendar, ChevronDown, Target, Wallet, ListOrdered } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function IntegratedRecordPage() {
  // --- [로직 유지] ---
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' or 'prize'

  useEffect(() => {
    async function initData() {
      const { data: eventData } = await supabase.from('event').select('*').order('event_date', { ascending: false });
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
    const { data: entryData } = await supabase.from('entry').select('*, user:user_public!user_id(name)').eq('event_id', eventId);
    const { data: scoreData } = await supabase.from('score').select('*').eq('event_id', eventId);
    const combined = entryData?.map(entry => {
      const s = scoreData?.find(score => score.user_id === entry.user_id) || {};
      const scores = [s.game_1 || 0, s.game_2 || 0, s.game_3 || 0, s.game_4 || 0, s.game_5 || 0];
      const total = scores.reduce((a, b) => a + b, 0);
      return { ...entry, total, avg: (total / 5).toFixed(1), scores };
    }).filter(entry => entry.result === true).sort((a, b) => b.total - a.total);
    setRankings(combined || []);
  }

  const selectedEvent = events.find(e => e.event_id === selectedEventId);

  // [로직 유지] calculateWinners
  const calculateWinners = () => {
    const winnerMap = {};
    const confirmedCount = rankings.filter(r => r.result === true && r.pay_person === true).length;
    const { prizes } = getPrizeData(selectedEvent?.event_pay_person, confirmedCount, { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 }, selectedEvent?.frame);
    for (let i = 0; i < (selectedEvent?.frame || 0); i++) {
      const gameRanking = [...rankings].map(r => ({ name: r.user?.name, score: r.scores[i] || 0 })).sort((a, b) => b.score - a.score);
      [0, 1, 2].forEach(rank => {
        const winner = gameRanking[rank];
        if (winner && winner.score > 0) winnerMap[winner.name] = (winnerMap[winner.name] || 0) + prizes[rank];
      });
    }
    return Object.entries(winnerMap).map(([name, totalPrize]) => ({ name, totalPrize })).sort((a, b) => b.totalPrize - a.totalPrize);
  };

  // [로직 유지] getPrizeData
  const getPrizeData = (pay, count, ratios, frame) => {
    if (!pay || !count || !frame || frame === 0) return { prizes: [0, 0, 0], totalRemainder: 0 };
    const totalPool = pay * count;
    const perGamePool = totalPool / frame;
    const p1 = Math.floor((perGamePool * (ratios.r1 / 100)) / 1000) * 1000;
    const p2 = Math.floor((perGamePool * (ratios.r2 / 100)) / 1000) * 1000;
    const p3 = Math.floor((perGamePool * (ratios.r3 / 100)) / 1000) * 1000;
    const totalPrizePerGame = p1 + p2 + p3;
    return { prizes: [p1, p2, p3], totalRemainder: totalPool - (totalPrizePerGame * frame) };
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-light animate-pulse">Loading...</div>;

  return (
    <div className="max-w-md mx-auto pt-16">
      {/* 1. 대회 선택 헤더 */}
      <div className="mb-8 px-2">
        <h2 className="text-2xl font-black text-slate-900 mb-1">인정 볼링장</h2>
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className="flex items-center gap-2 text-slate-500 font-bold text-sm"
          >
            {selectedEvent?.title} <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180' : ''} />
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 mt-2 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[80] p-2"
              >
                {events.map((ev) => (
                  <button key={ev.event_id} onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-5 py-3 rounded-2xl transition-colors ${selectedEventId === ev.event_id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'}`}
                  >
                    <span className="text-sm font-bold block">{ev.title}</span>
                    <span className="text-[10px] opacity-50 font-medium">{ev.event_date}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. 핵심 요약 (상태바 형태) */}
      <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-50 p-2 rounded-[28px]">
        <div className="text-center py-3 bg-white rounded-[22px] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">Entry</p>
          <p className="text-lg font-black text-indigo-600">{rankings.length}명</p>
        </div>
        <div className="text-center py-3">
          <p className="text-[10px] font-black text-slate-400 uppercase">Top</p>
          <p className="text-lg font-black text-slate-800 truncate px-1">{rankings[0]?.user?.name || '-'}</p>
        </div>
        <div className="text-center py-3">
          <p className="text-[10px] font-black text-slate-400 uppercase">Score</p>
          <p className="text-lg font-black text-slate-800">{rankings[0]?.total || 0}</p>
        </div>
      </div>

      {/* 3. 모바일 탭 메뉴 */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
        <button 
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          <ListOrdered size={16} /> 리더보드
        </button>
        <button 
          onClick={() => setActiveTab('prize')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-bold transition-all ${activeTab === 'prize' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Wallet size={16} /> 상금 현황
        </button>
      </div>

      {/* 4. 컨텐츠 영역 */}
      <AnimatePresence mode="wait">
        {activeTab === 'ranking' ? (
          <motion.div key="ranking" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
            {rankings.map((p, i) => (
              <div key={i} className="bg-white border border-slate-50 rounded-[32px] p-5 shadow-sm hover:border-indigo-100 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{p.user?.name}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Avg. {p.avg} / Total {p.total}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 leading-none">{p.total}</div>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-4 border-t border-slate-50">
                  {p.scores.map((score, idx) => (
                    <div key={idx} className={`text-center py-2 rounded-xl text-xs font-black ${score >= 200 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                      {score || '-'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="prize" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {/* 상금 단가 요약 */}
            {(() => {
              const confirmedCount = rankings.filter(r => r.result === true && r.pay_person === true).length;
              const { prizes, totalRemainder } = getPrizeData(selectedEvent?.event_pay_person, confirmedCount, { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 }, selectedEvent?.frame);
              
              return (
                <div className="space-y-6">
                  <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-4 text-center">Standard Prize (Per Game)</p>
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-center">
                        <span className="text-2xl block mb-1">🥇</span>
                        <span className="text-sm font-black">{prizes[0].toLocaleString()}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-white/20"></div>
                      <div className="text-center">
                        <span className="text-2xl block mb-1">🥈</span>
                        <span className="text-sm font-black">{prizes[1].toLocaleString()}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-white/20"></div>
                      <div className="text-center">
                        <span className="text-2xl block mb-1">🥉</span>
                        <span className="text-sm font-black">{prizes[2].toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-2xl py-3 px-4 flex justify-between items-center">
                      <span className="text-xs font-medium">잔여 상금(개인사이드)</span>
                      <span className="font-black text-sm">{totalRemainder.toLocaleString()}원</span>
                    </div>
                  </div>

                  {/* 수령자 목록 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">Total Winners</h3>
                    {calculateWinners().map((winner, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[28px] shadow-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-300">#{idx+1}</span>
                          <span className="font-bold text-slate-800">{winner.name}</span>
                        </div>
                        <span className="font-black text-indigo-600 text-lg">
                          {winner.totalPrize.toLocaleString()}<span className="text-xs ml-0.5">원</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}