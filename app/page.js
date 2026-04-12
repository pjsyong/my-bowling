'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Users, Star, Calendar, ChevronDown, Target } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

import { supabase } from '@/lib/supabase'; // 경로에 맞춰 수정


import React from 'react';

// 💡 1. 함수 이름은 반드시 대문자로 시작 (ProfilePage)
// 💡 2. 앞에 'export default'가 반드시 붙어야 함
export default function ProfilePage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">내 프로필</h1>
      <p className="mt-4 text-slate-500">프로필 페이지 준비 중입니다...</p>
    </div>
  );
}

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
    <div className="max-w-6xl mx-auto pb-20">
      {/* --- 상단 헤더 & 필터 --- */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">대회 기록</h2>
          <p className="text-slate-400 font-medium">
            {selectedEvent?.event_date} — {selectedEvent?.progress ? '종료됨' : '모집 중'}
          </p>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all font-medium text-sm"
          >
            <Calendar size={16} className="text-slate-400" />
            {selectedEvent?.title || '대회 선택'}
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-3 w-72 bg-white border border-gray-100 rounded-[24px] shadow-2xl z-50 overflow-hidden p-2"
              >
                {events.map((ev) => (
                  <button key={ev.event_id} onClick={() => { setSelectedEventId(ev.event_id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-5 py-4 rounded-2xl transition-colors flex flex-col gap-1 ${selectedEventId === ev.event_id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
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
        <div className="bg-white rounded-[40px] p-20 border border-gray-100 text-center">
          <h3 className="text-xl font-bold">현재 모집 중인 대회입니다</h3>
          <p className="text-slate-400 font-light mt-2">대회가 종료된 후 기록이 노출됩니다.</p>
        </div>
      ) : (
        <>
          {/* --- Stats 카드 섹션 --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard label="참가 인원" value={`${rankings.length}명`} icon={<Users size={20} className="text-slate-900"/>} />
            <StatCard label="현재 1위" value={rankings[0]?.user?.name || '-'} icon={<Trophy size={20} className="text-amber-600"/>} />
            <StatCard label="최고 총점" value={rankings[0]?.total || 0} icon={<Star size={20} className="text-blue-700"/>} />
            <StatCard label="목표 에버" value="180" icon={<Target size={20} className="text-emerald-700"/>} />
          </div>

          {/* --- Game Leaders (게임별 1,2,3위) --- */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6 px-2">
              <h3 className="text-xl font-bold tracking-tight text-slate-800">Game Leaders</h3>
              <div className="h-[1px] flex-1 bg-gray-100 ml-4"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((num) => {
                const top3 = [...rankings]
                  .map(r => ({ name: r.user?.name, score: r.scores?.[num - 1] || 0 }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3);
                return (
                  <div key={num} className="bg-white rounded-[28px] p-6 border border-gray-200 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Game {num}</p>
                    <div className="space-y-3">
                      {top3.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className={i === 0 ? "font-bold text-slate-900" : "text-slate-600"}>{p.name || '-'}</span>
                          <span className={i === 0 ? "font-black text-blue-700" : "text-slate-500 font-medium"}>{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- 전체 리더보드 표 (게임 점수 포함 버전) --- */}
          <motion.div layout className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50">
              <h3 className="text-xl font-bold text-slate-800">Leaderboard</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-slate-500 bg-slate-50/80">
                  <tr>
                    <th className="px-8 py-5 font-bold">Rank</th>
                    <th className="px-8 py-5 font-bold">Player</th>
                    {/* 게임별 헤더 */}
                    {[1, 2, 3, 4, 5].map(num => (
                      <th key={num} className="px-4 py-5 font-bold text-center">G{num}</th>
                    ))}
                    <th className="px-8 py-5 font-bold text-center">Avg</th>
                    <th className="px-8 py-5 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rankings.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors group">
                      {/* 순위 & 이름 (기존 동일) */}
                      <td className="px-8 py-6 font-black text-slate-300 group-hover:text-slate-500 transition-colors">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-bold text-slate-800 text-[15px]">{p.user?.name}</span>
                      </td>

                      {/* 개별 게임 점수 (1~5) */}
                      {/* 개별 게임 점수 (1~5) */}
                      {p.scores.map((score, idx) => {
                        const gameScores = rankings.map(r => r.scores[idx] || 0).sort((a, b) => b - a);
                        const rankInGame = gameScores.indexOf(score) + 1;
                        
                        // 💡 메달 전용 렌더링 함수: 크기와 그림자를 추가했습니다.
                        const renderBadge = () => {
                          if (score === 0) return null;
                          
                          // 메달 공통 스타일: 크기를 키우고(text-lg), 그림자(drop-shadow)를 추가했습니다.
                          const medalStyle = "text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-110";

                          if (rankInGame === 1) return <span className={`${medalStyle} text-amber-500`}>🥇</span>;
                          if (rankInGame === 2) return <span className={`${medalStyle} text-slate-400`}>🥈</span>;
                          if (rankInGame === 3) return <span className={`${medalStyle} text-orange-400`}>🥉</span>;
                          return null;
                        };

                        return (
                          <td key={idx} className="px-4 py-6 text-center border-x border-gray-50/50">
                            {/* 💡 컨테이너 정렬: 점수와 메달을 중앙에 꽉 차게 배치합니다. */}
                            <div className="flex flex-col items-center justify-center gap-2 min-h-[60px]">
                              {/* 점수: 200점 이상은 빨간색 (기존 로직 유지) */}
                              <span className={`text-[15px] font-black tracking-tight ${
                                score >= 200 
                                  ? 'text-red-500' 
                                  : 'text-slate-600'
                              }`}>
                                {score || '-'}
                              </span>
                              
                              {/* 💡 메달 배치 영역: 높이를 확실히 줘서 정렬을 맞춥니다. */}
                              <div className="h-6 flex items-center justify-center">
                                {renderBadge()}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* 에버리지 & 총점 (기존 동일) */}
                      <td className="px-8 py-6 text-center font-semibold text-slate-500 text-sm">{p.avg}</td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-lg font-black tracking-tight text-slate-800">{p.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
         {/* --- 상위 5인 게임별 상세 분석 (고정 높이 보정 버전) --- */}
          <div className="mt-12 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-10 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Top 5 Game Performance</h3>
              <p className="text-sm text-slate-400 mt-1 font-medium">유저별 1~5게임 점수와 평균 추이 (고정 레이아웃)</p>
            </div>

            <div className="px-10 pb-10">
              <div className="overflow-x-auto custom-scrollbar-x pb-4">
                {/* 💡 이 부분! min-width를 추가하고 height를 확실히 고정합니다 */}
                <div style={{ 
                  width: '1000px', 
                  minWidth: '1000px', // 너비가 줄어들지 않도록 고정
                  height: '400px', 
                  position: 'relative' // ResponsiveContainer가 기준을 잡기 좋게 설정
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={rankings.slice(0, 5).map(p => {
                        // ... 기존 데이터 로직 동일
                        const realAvg = Number(p.avg);
                        return {
                          name: p.user?.name,
                          "1G": p.scores[0] || 0,
                          "2G": p.scores[1] || 0,
                          "3G": p.scores[2] || 0,
                          "4G": p.scores[3] || 0,
                          "5G": p.scores[4] || 0,
                          avg: realAvg,
                          avgLine: realAvg + 100
                        };
                      })}
                      margin={{ top: 50, right: 30, left: 40, bottom: 20 }}
                    >
                      {/* 가로 눈금선을 더 연하게 (slate-50) 깔아줍니다 */}
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 13, fontWeight: 800, fill: '#1E293B' }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10} 
                      />

                      {/* 🛠️ Y축 활성화 및 단위 표시 */}
                      <YAxis 
                        domain={[0, 380]} 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                        // 왼쪽에 "점수" 단위 표시
                        label={{ 
                          angle: -90, 
                          position: 'insideLeft', 
                          style: { textAnchor: 'middle', fontSize: '11px', fill: '#94A3B8', fontWeight: 600 },
                          offset: -20
                        }}
                      />

                      <Tooltip 
                        cursor={{ fill: '#F8FAFC', opacity: 0.4 }}
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '12px' }} />

                      {/* 막대 및 선 (기존 로직 유지) */}
                      {["1G", "2G", "3G", "4G", "5G"].map((key, i) => (
                        <Bar key={key} dataKey={key} fill={["#E2E8F0", "#CBD5E1", "#94A3B8", "#475569", "#1E293B"][i]} radius={[4, 4, 0, 0]} barSize={20}>
                          <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fill: '#94A3B8' }} offset={5} />
                        </Bar>
                      ))}

                      <Line 
                        type="monotone" 
                        dataKey="avgLine" 
                        name="평균"
                        stroke="#3B82F6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                      >
                        <LabelList 
                          dataKey="avg" 
                          position="top" 
                          style={{ fontSize: '12px', fontWeight: '900', fill: '#2563EB' }} 
                          offset={10} 
                        />
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
    <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm transition-all">
      <div className="flex justify-between items-start mb-4">
        {/* 라벨: 은은하지만 명확한 회색 */}
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {label}
        </span>
        {/* 아이콘: 너무 튀지 않게 투명도 살짝 조절 */}
        <div className="opacity-80">
          {icon}
        </div>
      </div>
      {/* 데이터 값: 쌩검정 대신 깊이감 있는 slate-800 적용 */}
      <div className="text-2xl font-bold tracking-tight text-slate-800">
        {value}
      </div>
    </div>
  );
}