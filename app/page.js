'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Target, ChevronDown, Calendar, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MobileRecordPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-medium">데이터를 불러오는 중...</div>;

  return (
    <div className="space-y-8 pb-10">
      {/* 헤더 섹션 */}
      <header className="pt-8 px-1">
        <h2 className="text-3xl font-black text-slate-900 leading-tight">
          인정 볼링장<br/>
          <span className="text-indigo-600">점수 리더보드</span>
        </h2>
        
        <div className="relative mt-6">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-indigo-500" />
              <span className="font-bold text-slate-700">{selectedEvent?.title || '대회 선택'}</span>
            </div>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[90] overflow-hidden"
              >
                {events.map((ev) => (
                  <button 
                    key={ev.event_id} 
                    onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }}
                    className="w-full text-left p-5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <p className="font-bold text-slate-800">{ev.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{ev.event_date}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 요약 카드 */}
      <section className="grid grid-cols-2 gap-3 px-1">
        <MobileStatCard label="참가 인원" value={`${rankings.length}명`} icon={<Users size={20} className="text-indigo-500" />} />
        <MobileStatCard label="현재 1위" value={rankings[0]?.user?.name || '-'} icon={<Crown size={20} className="text-amber-500" />} />
        <MobileStatCard label="최고 총점" value={rankings[0]?.total || 0} icon={<Star size={20} className="text-purple-500" />} />
        <MobileStatCard label="에버 목표" value="200" icon={<Target size={20} className="text-emerald-500" />} />
      </section>

      {/* 게임 리더 */}
      <section>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-4 px-1">Game Leaders</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
          {[1, 2, 3, 4, 5].map((num) => {
            const leader = [...rankings]
              .map(r => ({ name: r.user?.name, score: r.scores?.[num - 1] || 0 }))
              .sort((a, b) => b.score - a.score)[0];
            return (
              <div key={num} className="min-w-[140px] bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-indigo-500 mb-2 uppercase tracking-widest">Game {num}</p>
                <p className="font-bold text-slate-800 text-sm truncate">{leader?.name || '-'}</p>
                <p className="text-xl font-black text-slate-900 mt-1">{leader?.score || 0}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 랭킹 리스트 */}
      <section className="space-y-3 px-1">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Ranking List</h3>
          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">Points Order</span>
        </div>
        
        {rankings.map((p, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-sm"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg
                  ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg tracking-tight">{p.user?.name}</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-0.5">Avg. {p.avg}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 leading-none">{p.total}</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Total</p>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-50">
              {p.scores.map((score, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-[8px] font-black text-slate-300 mb-1.5 uppercase">G{idx+1}</p>
                  <div className={`py-2.5 rounded-xl font-black text-xs ${score >= 200 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                    {score || '-'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}

function MobileStatCard({ label, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-[28px] border border-slate-50 shadow-sm">
      <div className="mb-3">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <p className="text-lg font-black text-slate-800 mt-1.5 truncate leading-none">{value}</p>
    </div>
  );
}