'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, User, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScoreEntryPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient(); // 2. 캐시 갱신용

  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // 3. React Query로 데이터 호출 (이벤트 정보 + 참가자 + 점수 통합)
  const { data: { eventInfo, entries } = { eventInfo: null, entries: [] }, isLoading: loading } = useQuery({
    queryKey: ['admin-scores', eventId],
    queryFn: async () => {
      // (1) 대회 정보
      const { data: eventData } = await supabase.from('event').select('*').eq('event_id', eventId).single();
      
      // (2) 확정된 참가자 목록
      const { data: entryData } = await supabase.from('entry').select(`user_id`).eq('event_id', eventId).eq('result', true);
      const userIds = entryData?.map(e => e.user_id) || [];

      // (3) 유저 이름 & 기존 점수 데이터
      const [userRes, scoreRes] = await Promise.all([
        supabase.from('user_public').select('user_id, name').in('user_id', userIds),
        supabase.from('score').select('*').eq('event_id', eventId)
      ]);

      const formattedEntries = (entryData || []).map(entry => {
        const user = userRes.data?.find(u => u.user_id === entry.user_id);
        const score = scoreRes.data?.find(s => s.user_id === entry.user_id) || {};
        
        return {
          user_id: entry.user_id,
          user_name: user?.name || '알 수 없음',
          score_id: score.score_id || null,
          game_1: score.game_1 || 0,
          game_2: score.game_2 || 0,
          game_3: score.game_3 || 0,
          game_4: score.game_4 || 0,
          game_5: score.game_5 || 0,
        };
      });

      return { eventInfo: eventData, entries: formattedEntries };
    },
    staleTime: 0, // 점수 입력은 실시간성이 중요하므로 0초!
  });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  // 4. 점수 업데이트 로직
  const handleScoreUpdate = async (user_id, field, value) => {
    const numValue = parseInt(value) || 0;
    const targetEntry = entries.find(e => e.user_id === user_id);

    // 낙관적 업데이트 대신, 안정성을 위해 처리 후 invalidateQueries 사용
    try {
      if (targetEntry.score_id) {
        await supabase.from('score').update({ [field]: numValue }).eq('score_id', targetEntry.score_id);
      } else {
        await supabase.from('score').insert([{
          user_id, event_id: Number(eventId), [field]: numValue
        }]);
      }
      showToast(`${field.split('_')[1]}게임 저장 완료`);
      
      // 5. 캐시 무효화를 통해 상단 Total 점수와 배지 상태를 즉시 갱신
      queryClient.invalidateQueries({ queryKey: ['admin-scores', eventId] });
    } catch (error) {
      console.error('Score Update Error:', error);
    }
  };

  // --- 이 함수를 추가하세요! ---
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 6. 권한 체크
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'injeong@gmail.com') {
        alert('관리자 인증이 필요합니다.');
        router.push('/admin');
      }
    };
    checkAuth();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 font-bold text-xs animate-in slide-in-from-top-4">
            <CheckCircle2 size={14} className="text-emerald-400" />
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin/scores" className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black text-slate-900 truncate">{eventInfo?.title}</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase italic">Admin Mode</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{entries.length} Players</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-2">
        {entries.map((entry) => {
          const total = entry.game_1 + entry.game_2 + entry.game_3 + entry.game_4 + entry.game_5;
          const isExpanded = expandedId === entry.user_id;
          
          // 각 게임별 입력 여부(0보다 크면 입력됨)를 배열로 구성
          const gameStatus = [
            { label: '1G', active: entry.game_1 > 0 },
            { label: '2G', active: entry.game_2 > 0 },
            { label: '3G', active: entry.game_3 > 0 },
            { label: '4G', active: entry.game_4 > 0 },
            { label: '5G', active: entry.game_5 > 0 },
          ];

          return (
            <div key={entry.user_id} className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'bg-white rounded-[24px] shadow-md my-4' : 'bg-white rounded-[16px] shadow-sm'}`}>
              {/* 접혀있을 때의 헤더 영역 */}
              <button 
                onClick={() => toggleExpand(entry.user_id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 truncate">{entry.user_name}</h3>
                    
                    {/* 게임별 입력 상태 배지: 0보다 크면 파란색, 0이면 회색 */}
                    <div className="flex gap-1 mt-1.5">
                      {gameStatus.map((game, idx) => (
                        <div 
                          key={idx}
                          className={`text-[8px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                            game.active 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {game.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total</p>
                    <p className={`font-black leading-none ${isExpanded ? 'text-2xl text-blue-600' : 'text-lg text-slate-900'}`}>
                      {total}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                </div>
              </button>

              {/* 펼쳐졌을 때의 입력 영역 */}
              {isExpanded && (
                <div className="px-4 pb-6 animate-in slide-in-from-top-2 duration-200 border-t border-slate-50 mt-2">
                  <div className="grid grid-cols-5 gap-2 pt-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="text-center">
                        <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase">Game {num}</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          defaultValue={entry[`game_${num}`]}
                          onBlur={(e) => handleScoreUpdate(entry.user_id, `game_${num}`, e.target.value)}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl py-3 text-center font-black text-slate-700 outline-none text-sm transition-all"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}