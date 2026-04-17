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
      // 쿼리 시 score 테이블의 모든 컬럼을 명시적으로 확인
      const { data, error } = await supabase
        .from('score')
        .select(`
          game_1, game_2, game_3, game_4, game_5,
          event_id,
          event:event_id ( title, event_date )
        `)
        .eq('user_id', selectedUser.id);

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      setDebugData(data); // 원본 데이터 디버깅용 저장

      return data.map(d => {
        // [수정] CSV 분석 결과, 값이 비어있거나 문자열인 경우를 더 확실하게 처리
        const rawValues = [d.game_1, d.game_2, d.game_3, d.game_4, d.game_5];
        
        const validScores = rawValues
          .map(v => {
            if (v === null || v === undefined || String(v).trim() === "") return NaN;
            return Number(v);
          })
          .filter(v => !isNaN(v) && v > 0);

        const total = validScores.reduce((acc, cur) => acc + cur, 0);
        const average = validScores.length > 0 ? total / validScores.length : 0;

        return {
          date: d.event?.event_date?.split('T')[0] || '-',
          event: d.event?.title || '알 수 없는 대회',
          score: Math.round(average),
          gameCount: validScores.length
        };
      }).sort((a, b) => new Date(a.date) - new Date(b.date)); // 날짜순 정렬
    },
  });

  // 통계 계산
  const scores = userRecordData.map(d => d.score).filter(s => s > 0);
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
                  <p className="text-[10px] font-black text-indigo-200 uppercase mb-1">Total Avg</p>
                  <p className="text-2xl font-black">{avgScore}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-[24px]">
                  <p className="text-[10px] font-black text-indigo-200 uppercase mb-1">Consistency</p>
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
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userRecordData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['dataMin - 20', 'dataMax + 20']} hide />
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                        <ReferenceLine y={Number(avgScore)} stroke="#6366f1" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={5} dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-3">
                  {userRecordData.slice().reverse().map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-white border border-slate-50 rounded-[32px] shadow-sm">
                      <div className="flex flex-col">
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
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}