'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ChevronRight, TrendingUp, Activity, BarChart3, ArrowLeft, Bug } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function ProfilePage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [debugData, setDebugData] = useState(null); // 디버깅용

  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'WED', 'RANK'

  // 1. 유저 검색
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setIsSearching(true);
    
    const { data, error } = await supabase
      .from('user_public')
      .select('user_id, name')
      .ilike('name', `%${searchInput}%`);
    
    if (!error) setSearchResults(data || []);
    setIsSearching(false);
  };

  // 2. 선택된 유저의 상세 데이터 가져오기
  const { data: userRecordData = [], isLoading: isDetailLoading, refetch } = useQuery({
    queryKey: ['personal-records', selectedUser?.id],
    enabled: !!selectedUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('score')
        .select(`
          game_1, game_2, game_3, game_4, game_5,
          event_id,
          event:event_id ( title, event_date, event_type ) // event_type 추가
        `)
        .eq('user_id', selectedUser.id);

      if (error) throw error;

      return data.map(d => {
        const rawValues = [d.game_1, d.game_2, d.game_3, d.game_4, d.game_5];
        const processedScores = rawValues.map(v => (v === null || v === "" || Number(v) === 0 ? NaN : Number(v)));
        const validScores = processedScores.filter(v => !isNaN(v));
        const average = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

        return {
          date: d.event?.event_date?.split('T')[0] || '-',
          event: d.event?.title || '알 수 없는 대회',
          eventType: d.event?.event_type || 'WED', // 기본값 설정
          score: Math.round(average),
          rawScores: processedScores
        };
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    },
  });

  const filteredData = userRecordData.filter(d => 
    activeFilter === 'ALL' ? true : d.eventType === activeFilter
  );

  // 통계 계산
  const scores = filteredData.map(d => d.score).filter(s => s > 0);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  const consistency = scores.length > 1 
    ? (scores.slice(1).reduce((acc, cur, i) => acc + Math.abs(cur - scores[i]), 0) / (scores.length - 1)).toFixed(1)
    : 0;

  return (
    <div className="max-w-md mx-auto pt-20 px-4 pb-24 min-h-screen bg-slate-50/50">
      <AnimatePresence mode="wait">
        {!selectedUser ? (
          <motion.div key="search-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             {/* 검색 UI 생략 (기존과 동일) */}
             <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 mb-2">기록 조회</h2>
              <p className="text-slate-500 text-sm font-medium">조회할 이름을 검색하세요.</p>
            </div>
            <form onSubmit={handleSearch} className="relative mb-8">
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold focus:border-indigo-500 outline-none shadow-sm"
                placeholder="이름 입력..."
              />
              <button type="submit" className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-6 rounded-[18px] font-black text-sm">검색</button>
            </form>
            <div className="space-y-3">
              {searchResults.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => setSelectedUser({ id: user.user_id, name: user.name })}
                  className="w-full flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[28px] shadow-sm"
                >
                  <span className="font-black text-lg text-slate-800">{user.name}</span>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="detail-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <button onClick={() => {setSelectedUser(null); setDebugData(null);}} className="flex items-center gap-2 text-slate-400 font-black text-xs">
                <ArrowLeft size={16} /> BACK
                </button>
                {/* 🔍 데이터가 안나올 때 확인용 디버그 버튼 */}
                <button onClick={() => console.log("Debug Data:", debugData)} className="p-2 bg-slate-200 rounded-full text-slate-500">
                    <Bug size={14} />
                </button>
            </div>

            <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100">
              <h2 className="text-4xl font-black mb-6">{selectedUser.name}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-[24px]">
                  <p className="text-[10px] font-black text-indigo-200 uppercase mb-1">전체 평균</p>
                  <p className="text-2xl font-black">{avgScore}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-[24px]">
                  <p className="text-[10px] font-black text-indigo-200 uppercase mb-1">일관성</p>
                  <p className="text-2xl font-black">{consistency}pt</p>
                </div>
              </div>
            </div>

            {isDetailLoading ? (
              <div className="p-20 text-center animate-pulse text-slate-400 font-black">ANALYZING...</div>
            ) : userRecordData.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">기록 데이터가 없습니다.</p>
                    <p className="text-[10px] text-slate-300 mt-2">ID: {selectedUser.id}</p>
                </div>
            ) : (
              <>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                {/* 1. 가로 스크롤 컨테이너 (데이터가 많아지면 우측 스크롤 활성화) */}
                <div className="h-64 w-full pt-4 overflow-x-auto overflow-y-hidden scrollbar-hide">
                  {/* 2. 데이터 개수에 따라 최소 너비를 동적으로 계산 (1개당 70px) */}
                  <div 
                    style={{ 
                      width: filteredData.length > 5 
                        ? `${filteredData.length * 70}px` 
                        : '100%',
                      height: '100%' 
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={filteredData} 
                        margin={{ top: 40, right: 40, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fontWeight: 'bold', fill: '#cbd5e1' }}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        
                        {/* 3. Y축: 다른 눈금은 모두 숨기고 '평균값' 숫자 하나만 표시 */}
                        <YAxis 
                          domain={['dataMin - 30', 'dataMax + 30']} 
                          ticks={[Number(avgScore)]} 
                          tick={{ fontSize: 11, fontWeight: '900', fill: '#6366f1' }}
                          tickLine={false}
                          axisLine={false}
                          width={35}
                        />
                        
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border-none">
                                  <p className="text-[10px] font-bold text-slate-400 mb-1">{data.date}</p>
                                  <p className="text-xs font-black mb-2">{data.event}</p>
                                  <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
                                    <p className="text-lg font-black text-indigo-400">AVG {data.score}</p>
                                    <p className="text-[9px] font-medium text-slate-300 font-mono">
                                      {/* 1~5게임 상세 점수 표시 */}
                                      {data.rawScores?.map((s, i) => isNaN(s) ? '-' : s).join(' / ')}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {/* 4. 평균 기준선 (가로 점선) */}
                        <ReferenceLine 
                          y={Number(avgScore)} 
                          stroke="#6366f1" 
                          strokeDasharray="5 5" 
                        />

                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#6366f1" 
                          strokeWidth={4} 
                          animationDuration={500}
                          dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8 }}
                          // 점 위에 직접 점수 레이블 표시
                          label={{ 
                            position: 'top', 
                            fill: '#6366f1', 
                            fontSize: 12, 
                            fontWeight: '900',
                            offset: 15 
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="flex bg-white/50 p-1.5 rounded-[24px] border border-slate-100 gap-1">
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'WED', label: '수발이' },
                  { id: 'RANK', label: '랭킹전' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`flex-1 py-3 rounded-[20px] text-xs font-black transition-all ${
                      activeFilter === tab.id 
                        ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100' 
                        : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredData.slice().reverse().map((record, idx) => (
                  <div key={idx} className="p-6 bg-white border border-slate-50 rounded-[32px] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col gap-1">
                        {/* 타입에 따른 뱃지 추가 */}
                        <span className={`w-fit px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase ${
                          record.eventType === 'RANK' ? 'bg-orange-500' : 'bg-indigo-600'
                        }`}>
                          {record.eventType === 'RANK' ? 'RANKING' : 'SU-BAL-I'}
                        </span>
                        <span className="text-sm font-black text-slate-800">{record.event}</span>
                        <span className="text-[10px] font-bold text-slate-400">{record.date}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900">{record.score}</p>
                        <p className={`text-[10px] font-black ${(record.score - avgScore) >= 0 ? 'text-indigo-500' : 'text-rose-400'}`}>
                          {(record.score - avgScore) >= 0 ? '▲' : '▼'} {Math.abs(record.score - avgScore).toFixed(1)}
                        </p>
                      </div>
                    </div>
                    
                    {/* 1~5 게임 점수 영역 */}
                    <div className="flex gap-2 justify-between border-t border-slate-50 pt-4">
                      {record.rawScores.map((s, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <span className="text-[8px] font-black text-slate-300 mb-1">{i + 1}G</span>
                          <span className="text-xs font-bold text-slate-600">{isNaN(s) ? '-' : s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
       {filteredData.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-bold text-sm">
            해당 카테고리의 대회가 없습니다.
          </div>
        )}
    </div>
  );
}