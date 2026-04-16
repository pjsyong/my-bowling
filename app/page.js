'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Calendar, ChevronDown, Target, Wallet, List } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function IntegratedRecordPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' or 'prize'

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

  const getPrizeData = (pay, count, ratios, frame) => {
    if (!pay || !count || !frame || frame === 0) return { prizes: [0, 0, 0], totalRemainder: 0 };
    const totalPool = pay * count;
    const perGamePool = totalPool / frame;
    const p1 = Math.floor((perGamePool * (ratios.r1 / 100)) / 1000) * 1000;
    const p2 = Math.floor((perGamePool * (ratios.r2 / 100)) / 1000) * 1000;
    const p3 = Math.floor((perGamePool * (ratios.r3 / 100)) / 1000) * 1000;
    const totalPrizePerGame = p1 + p2 + p3;
    const totalRemainder = totalPool - (totalPrizePerGame * frame);
    return { prizes: [p1, p2, p3], totalRemainder };
  };

  const calculateWinners = () => {
    const winnerMap = {};
    const confirmedCount = rankings.filter(r => r.result === true && r.pay_person === true).length;
    const { prizes } = getPrizeData(
      selectedEvent?.event_pay_person,
      confirmedCount,
      { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 },
      selectedEvent?.frame
    );

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

  if (loading) return <div className="p-10 text-slate-400 text-center font-light">데이터를 불러오는 중...</div>;

  return (
    <div className="bg-[#F8F9FA] min-h-screen pb-10">
      {/* 고정 헤더 영역 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">IN-JEONG 🎳</h2>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"
          >
            <span className="text-xs font-bold text-slate-600">{selectedEvent?.title}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 이벤트 선택 드롭다운 모달 */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full bg-white shadow-xl border-b border-slate-100 z-50 p-2 max-h-[60vh] overflow-y-auto"
            >
              {events.map((ev) => (
                <button 
                  key={ev.event_id} 
                  onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }}
                  className={`w-full text-left p-4 rounded-xl mb-1 ${selectedEventId === ev.event_id ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-sm font-bold text-slate-800">{ev.title}</div>
                  <div className="text-[10px] text-slate-400">{ev.event_date}</div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 탭 네비게이션 */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ranking' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
          >
            <List size={14} /> 순위/기록
          </button>
          <button 
            onClick={() => setActiveTab('prize')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'prize' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
          >
            <Wallet size={14} /> 상금 정산
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'ranking' ? (
          <div className="space-y-4">
            {/* 요약 카드 스테이터스 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">참가/확정</p>
                <p className="text-lg font-black text-slate-800">{rankings.length} / {rankings.filter(r => r.pay_person).length}명</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">최고 점수</p>
                <p className="text-lg font-black text-blue-600">{rankings[0]?.total || 0}</p>
              </div>
            </div>

            {/* 랭킹 리스트 */}
            <div className="space-y-3">
              {rankings.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <div className="flex items-center p-4 gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 
                      ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-50 text-orange-600' : 'text-slate-300'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{p.user?.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Avg. {p.avg}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900 leading-none">{p.total}</span>
                    </div>
                  </div>
                  {/* 게임별 상세 점수 (가로 스크롤) */}
                  <div className="flex bg-slate-50/50 border-t border-slate-50 px-4 py-2 gap-2 overflow-x-auto no-scrollbar">
                    {p.scores.map((score, idx) => (
                      <div key={idx} className="flex flex-col items-center min-w-[45px] py-1">
                        <span className="text-[8px] font-bold text-slate-300 mb-0.5">G{idx+1}</span>
                        <span className={`text-xs font-black ${score >= 200 ? 'text-red-500' : 'text-slate-600'}`}>
                          {score || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 상금 탭 내용 */
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-blue-600 rounded-[28px] p-6 text-white shadow-lg shadow-blue-100">
              <p className="text-xs font-medium opacity-80 mb-1">개인 사이드 총합</p>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-black">
                  {((selectedEvent?.event_pay_person || 0) * (rankings.filter(r => r.pay_person).length)).toLocaleString()}
                  <span className="text-sm font-normal ml-1 italic">원</span>
                </h3>
                <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">확정 {rankings.filter(r => r.pay_person).length}명 기준</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(() => {
                const { prizes } = getPrizeData(
                  selectedEvent?.event_pay_person,
                  rankings.filter(r => r.pay_person).length,
                  { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 },
                  selectedEvent?.frame
                );
                return prizes.map((amt, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{idx+1}등 상금</p>
                    <p className="text-sm font-black text-slate-800">{amt.toLocaleString()}</p>
                  </div>
                ));
              })()}
            </div>

            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> 최종 정산 결과
              </h4>
              <div className="space-y-3">
                {calculateWinners().map((winner, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="font-bold text-slate-700 text-sm">{winner.name}</span>
                    <span className="font-black text-blue-600 text-base">
                      {winner.totalPrize.toLocaleString()}<span className="text-[10px] ml-0.5">원</span>
                    </span>
                  </div>
                ))}
                {calculateWinners().length === 0 && (
                  <p className="text-center py-10 text-slate-400 text-xs italic">정산 데이터가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}