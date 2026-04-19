'use client';

import React, { useState, useEffect, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, User, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScoreEntryPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // 1. 입력 중인 점수를 실시간으로 UI에 보여주기 위한 로컬 상태
  const [localScores, setLocalScores] = useState({});

  // 2. React Query 데이터 호출
  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin-scores', eventId],
    queryFn: async () => {
      const { data: eventData } = await supabase.from('event').select('*').eq('event_id', eventId).single();
      const { data: entryData } = await supabase.from('entry').select(`user_id`).eq('event_id', eventId).eq('result', true);
      const userIds = entryData?.map(e => e.user_id) || [];

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
    staleTime: 60000, 
  });

  const eventInfo = data?.eventInfo;
  const entries = data?.entries || [];

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  // 3. 입력 시 로컬 상태 업데이트 (UI 즉시 반영용)
  const handleInputChange = (user_id, field, value) => {
    const numValue = parseInt(value) || 0;
    setLocalScores(prev => ({
      ...prev,
      [user_id]: {
        ...(prev[user_id] || entries.find(e => e.user_id === user_id)),
        [field]: numValue
      }
    }));
  };

  // 4. DB 저장 로직 (가장 중요한 부분)
  const handleScoreSave = async (user_id, field, value) => {
    const numValue = parseInt(value) || 0;
    
    // 캐시된 데이터에서 현재 유저의 정보를 가져옴
    const currentCachedData = queryClient.getQueryData(['admin-scores', eventId]);
    const currentEntry = currentCachedData?.entries.find(e => e.user_id === user_id);
    const gameNum = field.split('_')[1];

    try {
      if (currentEntry?.score_id) {
        // 이미 score 레코드가 있는 경우 -> UPDATE
        const { error } = await supabase
          .from('score')
          .update({ [field]: numValue })
          .eq('score_id', currentEntry.score_id);
        
        if (error) throw error;

        // 캐시 데이터도 즉시 업데이트 (다른 필드 입력 시 최신 상태 유지)
        queryClient.setQueryData(['admin-scores', eventId], (old) => ({
          ...old,
          entries: old.entries.map(e => e.user_id === user_id ? { ...e, [field]: numValue } : e)
        }));

      } else {
        // score 레코드가 없는 경우 -> INSERT
        const { data: newScore, error } = await supabase
          .from('score')
          .insert([{
            user_id, 
            event_id: Number(eventId), 
            [field]: numValue
          }])
          .select()
          .single();
        
        if (error) throw error;

        // ★★★ 중요: 새로 생성된 score_id를 쿼리 캐시에 즉시 반영 ★★★
        // 이렇게 해야 다음 게임 점수를 넣을 때 'UPDATE'로 작동합니다.
        queryClient.setQueryData(['admin-scores', eventId], (old) => ({
          ...old,
          entries: old.entries.map(e => 
            e.user_id === user_id ? { ...e, score_id: newScore.score_id, [field]: numValue } : e
          )
        }));
      }
      showToast(`${gameNum}G 저장 완료`);
    } catch (error) {
      console.error('Score Update Error:', error);
      alert('저장 실패: ' + error.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
          // 로컬 상태(수정중)가 있으면 그것을, 없으면 DB 캐시 데이터를 표시
          const currentData = localScores[entry.user_id] || entry;
          const total = currentData.game_1 + currentData.game_2 + currentData.game_3 + currentData.game_4 + currentData.game_5;
          const isExpanded = expandedId === entry.user_id;
          
          const gameStatus = [
            { label: '1G', active: currentData.game_1 > 0 },
            { label: '2G', active: currentData.game_2 > 0 },
            { label: '3G', active: currentData.game_3 > 0 },
            { label: '4G', active: currentData.game_4 > 0 },
            { label: '5G', active: currentData.game_5 > 0 },
          ];

          return (
            <div key={entry.user_id} className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'bg-white rounded-[24px] shadow-md my-4' : 'bg-white rounded-[16px] shadow-sm'}`}>
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

              {isExpanded && (
                <div className="px-4 pb-6 animate-in slide-in-from-top-2 duration-200 border-t border-slate-50 mt-2">
                  <div className="grid grid-cols-5 gap-2 pt-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="text-center">
                        <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase">Game {num}</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={currentData[`game_${num}`] === 0 ? '' : currentData[`game_${num}`]}
                          onChange={(e) => handleInputChange(entry.user_id, `game_${num}`, e.target.value)}
                          onBlur={(e) => handleScoreSave(entry.user_id, `game_${num}`, e.target.value)}
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