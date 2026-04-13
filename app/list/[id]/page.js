'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Calendar, ChevronDown, Target } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function RecordPage() {
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
    const { data: entryData } = await supabase.from('entry').select('*, user:user_id(name)').eq('event_id', eventId);
    const { data: scoreData } = await supabase.from('score').select('*').eq('event_id', eventId);

    const combined = entryData?.map(entry => {
      const s = scoreData?.find(score => score.user_id === entry.user_id) || {};
      const scores = [s.game_1 || 0, s.game_2 || 0, s.game_3 || 0, s.game_4 || 0, s.game_5 || 0];
      const total = scores.reduce((a, b) => a + b, 0);
      return { ...entry, total, avg: (total / 5).toFixed(1), scores };
    }).sort((a, b) => b.total - a.total);

    setRankings(combined || []);
  }

  const selectedEvent = events.find(e => e.event_id === selectedEventId);

  if (loading) return <div className="p-10 text-slate-400 animate-pulse font-light">Loading Tournament Data...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-20 pt-6">
      {/* --- 상단 헤더 & 필터: 모바일에서 세로 배치 --- */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 text-slate-900">In-Jeong 볼링장 점수판</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">
            {selectedEvent?.event_date}
          </p>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full md:w-auto flex justify-between items-center gap-3 px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm font-medium text-sm"
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              {selectedEvent?.title || '대회 선택'}
            </div>
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-3 w-full md:w-72 bg-white border border-gray-100 rounded-[24px] shadow-2xl z-50 overflow-hidden p-2"
              >
                {events.map((ev) => (
                  <button key={ev.event_id} onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-5 py-3 rounded-xl transition-colors flex flex-col gap-1 ${selectedEventId === ev.event_id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                  >
                    <span className={`text-sm font-bold ${selectedEventId === ev.event_id ? 'text-black' : 'text-slate-600'}`}>{ev.title}</span>
                    <span className="text-[10px] text-slate-400 tracking-widest">{ev.event_date}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedEvent?.progress === false ? (
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-12 md:p-20 border border-gray-100 text-center">
          <h3 className="text-lg md:text-xl font-bold">현재 정산되지 않은 대회입니다.</h3>
          <p className="text-slate-400 font-light mt-2 text-sm">대회가 종료된 후 기록이 노출됩니다.</p>
        </div>
      ) : (
        <>
          {/* --- Stats 카드 섹션: 모바일 2열 --- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-12">
            <StatCard label="참가 인원" value={`${rankings.length}명`} icon={<Users size={18} className="text-slate-900"/>} />
            <StatCard label="현재 1위" value={rankings[0]?.user?.name || '-'} icon={<Trophy size={18} className="text-amber-600"/>} />
            <StatCard label="최고 총점" value={rankings[0]?.total || 0} icon={<Star size={18} className="text-blue-700"/>} />
            <StatCard label="목표 에버" value="200" icon={<Target size={18} className="text-emerald-700"/>} />
          </div>

          {/* --- Game Leaders: 가로 스크롤 또는 그리드 조정 --- */}
          <div className="mb-10 md:mb-12">
            <div className="flex items-center gap-2 mb-4 md:mb-6 px-2">
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 text-nowrap">Game Leaders</h3>
              <div className="h-[1px] flex-1 bg-gray-100 ml-4"></div>
            </div>
            {/* 모바일에서는 가로 스크롤이 가능하도록 설정 */}
            <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-4 px-2 snap-x no-scrollbar">
              {[1, 2, 3, 4, 5].map((num) => {
                const top3 = [...rankings]
                  .map(r => ({ name: r.user?.name, score: r.scores?.[num - 1] || 0 }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3);
                return (
                  <div key={num} className="min-w-[140px] flex-shrink-0 md:min-w-0 bg-white rounded-[24px] p-5 border border-gray-200 shadow-sm snap-start">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Game {num}</p>
                    <div className="space-y-2">
                      {top3.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-xs md:text-sm">
                          <span className={i === 0 ? "font-bold text-slate-900" : "text-slate-600 truncate mr-2"}>{p.name || '-'}</span>
                          <span className={i === 0 ? "font-black text-blue-700" : "text-slate-500 font-medium"}>{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- 전체 리더보드: 모바일 가독성 상향 --- */}
          <motion.div layout className="bg-white rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Leaderboard</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px] md:min-w-[800px]">
                <thead className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-slate-500 bg-slate-50/80">
                  <tr>
                    <th className="px-4 md:px-8 py-4 font-bold">Rank</th>
                    <th className="px-4 md:px-8 py-4 font-bold">Player</th>
                    {[1, 2, 3, 4, 5].map(num => (
                      <th key={num} className="px-2 py-4 font-bold text-center">G{num}</th>
                    ))}
                    <th className="px-4 py-4 font-bold text-center">Avg</th>
                    <th className="px-4 md:px-8 py-4 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rankings.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-4 md:px-8 py-4 md:py-6 font-black text-slate-300 group-hover:text-slate-500 text-xs md:text-base">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <span className="font-bold text-slate-800 text-sm md:text-[15px]">{p.user?.name}</span>
                      </td>

                      {p.scores.map((score, idx) => {
                        const gameScores = rankings.map(r => r.scores[idx] || 0).sort((a, b) => b - a);
                        const rankInGame = gameScores.indexOf(score) + 1;
                        
                        const renderBadge = () => {
                          if (score === 0) return null;
                          const medalStyle = "text-base md:text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-110";
                          if (rankInGame === 1) return <span className={`${medalStyle}`}>🥇</span>;
                          if (rankInGame === 2) return <span className={`${medalStyle}`}>🥈</span>;
                          if (rankInGame === 3) return <span className={`${medalStyle}`}>🥉</span>;
                          return null;
                        };

                        return (
                          <td key={idx} className="px-1 md:px-4 py-4 md:py-6 text-center border-x border-gray-50/50">
                            <div className="flex flex-col items-center justify-center gap-1 min-h-[40px] md:min-h-[60px]">
                              <span className={`text-xs md:text-[15px] font-black tracking-tight ${score >= 200 ? 'text-red-500' : 'text-slate-600'}`}>
                                {score || '-'}
                              </span>
                              <div className="h-4 md:h-6 flex items-center justify-center">
                                {renderBadge()}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      
                      <td className="px-2 md:px-8 py-4 md:py-6 text-center font-semibold text-slate-500 text-xs md:text-sm">{p.avg}</td>
                      <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                        <span className="text-sm md:text-lg font-black tracking-tight text-slate-800">{p.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* --- 차트 섹션: 모바일 대응 높이 및 마진 --- */}
          <div className="mt-10 md:mt-12 bg-white rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 md:p-10 pb-4">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Performance Trends</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">전체 참가자의 게임별 기록 및 평균 추이</p>
            </div>

            <div className="px-4 md:px-10 pb-10">
              <div className="overflow-x-auto pb-6 custom-scrollbar">
                <div style={{ 
                  width: `${Math.max(800, rankings.length * 100)}px`, 
                  height: '350px', 
                  position: 'relative' 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={rankings.map(p => ({
                        name: p.user?.name,
                        "1G": p.scores[0] || 0,
                        "2G": p.scores[1] || 0,
                        "3G": p.scores[2] || 0,
                        "4G": p.scores[3] || 0,
                        "5G": p.scores[4] || 0,
                        avg: Number(p.avg),
                        avgLine: Number(p.avg) + 150
                      }))}
                      margin={{ top: 40, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} interval={0} dy={10} />
                      <YAxis domain={[0, 400]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <Tooltip cursor={{ fill: '#F8FAFC', opacity: 0.4 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
                      {["1G", "2G", "3G", "4G", "5G"].map((key, i) => (
                        <Bar key={key} dataKey={key} fill={["#E2E8F0", "#CBD5E1", "#94A3B8", "#475569", "#1E293B"][i]} radius={[2, 2, 0, 0]} barSize={15}>
                          <LabelList dataKey={key} position="top" style={{ fontSize: '8px', fill: '#94A3B8' }} offset={4} />
                        </Bar>
                      ))}
                      <Line type="monotone" dataKey="avgLine" name="평균" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }}>
                        <LabelList dataKey="avg" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#2563EB' }} offset={8} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="p-4 md:p-6 rounded-[24px] md:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all">
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </span>
        <div className="opacity-80 scale-75 md:scale-100">
          {icon}
        </div>
      </div>
      <div className="text-lg md:text-2xl font-bold tracking-tight text-slate-800 truncate">
        {value}
      </div>
    </div>
  );
}