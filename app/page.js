'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Calendar, ChevronDown, Target } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function IntegratedRecordPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      .select('*, user:user_public!user_id(name)') // user 대신 user_public 뷰를 참조
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
    .filter(entry => entry.result === true) // ✅ 이 줄을 추가하여 확정자만 남깁니다.
    .sort((a, b) => b.total - a.total);

    setRankings(combined || []);
  }


  const calculateWinners = () => {
    const winnerMap = {}; // { '이름': 총상금 }

    // 1. UI에 표시된 확정 인원수 계산 (이미지 하단 '확정 27명 기준'과 동일)
    const confirmedCount = rankings.filter(r => r.result === true && r.pay_person === true).length;

    // 2. UI 상단 카드에 표시된 1/2/3등 상금 가져오기
    const { prizes } = getPrizeData(
      selectedEvent?.event_pay_person,
      confirmedCount,
      { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 },
      selectedEvent?.frame
    );

    // 3. 게임별 1/2/3등에게 해당 상금을 이름표 붙여서 더해주기
    // selectedEvent?.frame이 4라면, 0, 1, 2, 3 인덱스(G1~G4)만 돕니다.
    for (let i = 0; i < (selectedEvent?.frame || 0); i++) {
      const gameRanking = [...rankings]
        .map(r => ({ name: r.user?.name, score: r.scores[i] || 0 }))
        .sort((a, b) => b.score - a.score);

      // 각 게임의 1, 2, 3등에게 위에서 정의한 prizes 값을 그대로 누적
      [0, 1, 2].forEach(rank => {
        const winner = gameRanking[rank];
        if (winner && winner.score > 0) {
          winnerMap[winner.name] = (winnerMap[winner.name] || 0) + prizes[rank];
        }
      });
    }

    // 4. 합산된 결과를 상금 높은 순으로 정렬해서 반환
    return Object.entries(winnerMap)
      .map(([name, totalPrize]) => ({ name, totalPrize }))
      .sort((a, b) => b.totalPrize - a.totalPrize);
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

  const selectedEvent = events.find(e => e.event_id === selectedEventId);

  if (loading) return <div className="p-10 text-slate-400 animate-pulse text-center font-light">Loading Tournament Data...</div>;

  return (
    <div className={`mx-auto pb-20 pt-6 ${isMobile ? 'max-w-md px-4' : 'max-w-6xl'}`}>
      {/* --- 공통 헤더 --- */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 text-slate-900">In-Jeong 볼링장 점수판</h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">{selectedEvent?.event_date}</p>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className="w-full md:w-auto flex justify-between items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm font-medium text-sm"
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              {selectedEvent?.title}
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

      {/* --- 상단 요약 카드 (반응형 그리드) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard 
          label="참가 인원" 
          value={`${rankings.filter(r => r.result === true).length}명`} 
          icon={<Users size={20}/>} 
        />
        <StatCard label="현재 1위" value={rankings[0]?.user?.name || '-'} icon={<Trophy size={20} className="text-amber-500"/>} />
        <StatCard label="최고 총점" value={rankings[0]?.total || 0} icon={<Star size={20} className="text-blue-500"/>} />
        <StatCard label="목표 에버" value="200" icon={<Target size={20} className="text-emerald-500"/>} />
      </div>

      {/* --- Game Leaders (공통: 모바일 가로 스크롤 / PC 그리드) --- */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-4 md:mb-6 px-1">
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-800">Game Leaders</h3>
          <div className="h-[1px] flex-1 bg-gray-100 ml-4"></div>
        </div>
        <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
          {[1, 2, 3, 4, 5].map((num) => {
            const top3 = [...rankings]
              .map(r => ({ name: r.user?.name, score: r.scores?.[num - 1] || 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3);
            return (
              <div key={num} className="min-w-[145px] flex-shrink-0 md:min-w-0 bg-white rounded-[24px] md:rounded-[28px] p-5 md:p-6 border border-gray-100 shadow-sm snap-start">
                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Game {num}</p>
                <div className="space-y-2 md:space-y-3">
                  {top3.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs md:text-sm">
                      <span className={i === 0 ? "font-bold text-slate-900" : "text-slate-600 truncate mr-1"}>{p.name || '-'}</span>
                      <span className={i === 0 ? "font-black text-blue-700" : "text-slate-500 font-medium"}>{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Prize Amount Cards (Title Removed) --- */}
      <div className="mb-10 md:mb-12">
        {(() => {
          // [수정 포인트]: 단순히 rankings.length(전체 신청자)를 쓰지 않고, 
          // result와 pay_person이 모두 true인 인원만 필터링하여 상금을 계산합니다.
          const confirmedCount = rankings.filter(r => 
            r.result === true && r.pay_person === true
          ).length || 0;

          const { prizes, totalRemainder } = getPrizeData(
            selectedEvent?.event_pay_person,
            confirmedCount, // <-- 수정된 확정 인원 전달
            { r1: selectedEvent?.ratio_1, r2: selectedEvent?.ratio_2, r3: selectedEvent?.ratio_3 },
            selectedEvent?.frame
          );

          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <PrizeBox label="1등 금액" amount={prizes[0]} color="bg-indigo-50 text-indigo-700 border-indigo-100" rank="🥇" />
              <PrizeBox label="2등 금액" amount={prizes[1]} color="bg-purple-50 text-purple-700 border-purple-100" rank="🥈" />
              <PrizeBox label="3등 금액" amount={prizes[2]} color="bg-emerald-50 text-emerald-700 border-emerald-100" rank="🥉" />
              <div className="flex flex-col justify-center p-5 md:p-6 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">남는 금액</span>
                  {/* 시각적으로 확정 인원수를 작게 표시해주면 더 친절합니다 */}
                  <span className="text-[12px] font-bold text-indigo-400">개인 사이드 : 총 {confirmedCount}명</span>
                </div>
                <span className="text-lg font-bold text-slate-600">{totalRemainder.toLocaleString()}원</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* --- Prize Winners List --- */}
      <div className="mt-6 md:mt-8 mb-6 md:mb-10">
        <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-wider">우승 상금</h3>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sorted by Amount</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {calculateWinners().map((winner, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black 
                    ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-bold text-slate-700">{winner.name}</span>
                </div>
                <span className="font-black text-indigo-600">
                  {winner.totalPrize.toLocaleString()}<span className="text-[10px] ml-0.5">원</span>
                </span>
              </div>
            ))}
            {calculateWinners().length === 0 && (
              <p className="col-span-2 text-center py-4 text-slate-400 text-xs font-medium italic">수령 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* --- 본문 리스트/테이블 --- */}
      {isMobile ? (
        /* 📱 모바일 버전: 카드 리스트 UI */
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1 mb-2">
            <h3 className="text-lg font-bold text-slate-800">Ranking List</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-nowrap">Total Score Order</span>
          </div>
          {rankings.map((p, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                    ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{p.user?.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Avg. {p.avg}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-black text-slate-900 leading-none">{p.total}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Points</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-50">
                {p.scores.map((score, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-[8px] font-black text-slate-300 mb-1 uppercase">G{idx+1}</p>
                    <div className={`py-2 rounded-lg font-bold text-xs ${score >= 200 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                      {score || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* 💻 PC 버전: 주셨던 원래의 풍부한 UI */
        <>
          {/* --- 리더보드 테이블 --- */}
          <motion.div layout className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden mb-12">
            <div className="px-10 py-8 border-b border-gray-50">
              <h3 className="text-xl font-bold text-slate-800">전체 점수 현황</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-slate-500 bg-slate-50/80">
                  <tr>
                    <th className="px-8 py-5 font-bold">Rank</th>
                    <th className="px-8 py-5 font-bold">Player</th>
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
                      <td className="px-8 py-6 font-black text-slate-300 group-hover:text-slate-500">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-bold text-slate-800 text-[15px]">{p.user?.name}</span>
                      </td>
                      {p.scores.map((score, idx) => {
                        const gameScores = rankings.map(r => r.scores[idx] || 0).sort((a, b) => b - a);
                        const rankInGame = gameScores.indexOf(score) + 1;
                        const renderBadge = () => {
                          if (score === 0) return null;
                          const medalStyle = "text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-110";
                          if (rankInGame === 1) return <span className={`${medalStyle}`}>🥇</span>;
                          if (rankInGame === 2) return <span className={`${medalStyle}`}>🥈</span>;
                          if (rankInGame === 3) return <span className={`${medalStyle}`}>🥉</span>;
                          return null;
                        };
                        return (
                          <td key={idx} className="px-4 py-6 text-center border-x border-gray-50/50">
                            <div className="flex flex-col items-center justify-center gap-2 min-h-[60px]">
                              <span className={`text-[15px] font-black tracking-tight ${score >= 200 ? 'text-red-500' : 'text-slate-600'}`}>
                                {score || '-'}
                              </span>
                              <div className="h-6 flex items-center justify-center">{renderBadge()}</div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-8 py-6 text-center font-semibold text-slate-500 text-sm">{p.avg}</td>
                      <td className="px-8 py-6 text-right font-black text-lg text-slate-800">{p.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* --- 차트 섹션 --- */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-10 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Player Performance Trends</h3>
            </div>
            <div className="px-10 pb-10">
              <div className="overflow-x-auto pb-6 custom-scrollbar">
                <div style={{ width: `${Math.max(1000, rankings.length * 150)}px`, height: '450px', position: 'relative' }}>
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
                      margin={{ top: 50, right: 30, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} interval={0} dy={15} />
                      <YAxis domain={[0, 400]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <Tooltip cursor={{ fill: '#F8FAFC', opacity: 0.4 }} contentStyle={{ borderRadius: '20px', border: 'none' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} />
                      {["1G", "2G", "3G", "4G", "5G"].map((key, i) => (
                        <Bar key={key} dataKey={key} fill={["#E2E8F0", "#CBD5E1", "#94A3B8", "#475569", "#1E293B"][i]} radius={[4, 4, 0, 0]} barSize={25}>
                          <LabelList dataKey={key} position="top" style={{ fontSize: '9px', fill: '#94A3B8' }} offset={5} />
                        </Bar>
                      ))}
                      <Line type="monotone" dataKey="avgLine" name="평균" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}>
                        <LabelList dataKey="avg" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: '#2563EB' }} offset={10} />
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
    <div className="p-5 md:p-6 rounded-[24px] md:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all">
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</span>
        <div className="opacity-80 scale-90 md:scale-100">{icon}</div>
      </div>
      <div className="text-lg md:text-2xl font-bold tracking-tight text-slate-800 truncate">{value}</div>
    </div>
  );
}

function PrizeBox({ label, amount, color, rank }) {
  return (
    <div className={`flex items-center justify-between p-5 md:p-6 rounded-[24px] border ${color} shadow-sm`}>
      <div>
        <p className="text-[12px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-black">{amount.toLocaleString()}<span className="text-sm font-bold ml-1">원</span></p>
      </div>
      <span className="text-3xl opacity-80">{rank}</span>
    </div>
  );
}