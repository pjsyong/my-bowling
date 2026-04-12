'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScoreEntryPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const [eventInfo, setEventInfo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 대회 정보 로드
      const { data: eventData } = await supabase.from('event').select('*').eq('event_id', eventId).single();
      setEventInfo(eventData);

      // 2. 신청 확정된 유저(result: true) 목록 로드
      // 여기서 user_id만 먼저 가져옵니다.
      const { data: entryData, error: entryError } = await supabase
        .from('entry')
        .select(`user_id`)
        .eq('event_id', eventId)
        .eq('result', true);

      if (entryError) throw entryError;

      const userIds = entryData.map(e => e.user_id);

      // 3. 해당 유저들의 이름 정보 가져오기
      const { data: userData, error: userError } = await supabase
        .from('user') // 테이블명이 'users'라면 'users'로 수정
        .select('user_id, name')
        .in('user_id', userIds);
      
      if (userError) throw userError;

      // 4. 해당 대회의 기존 점수 데이터 가져오기
      const { data: scoreData, error: scoreError } = await supabase
        .from('score')
        .select('*')
        .eq('event_id', eventId);

      if (scoreError) throw scoreError;

      // 5. 데이터 조립 (Frontend에서 매칭)
      const formattedEntries = entryData.map(entry => {
        const user = userData?.find(u => u.user_id === entry.user_id);
        const score = scoreData?.find(s => s.user_id === entry.user_id) || {};
        
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

      setEntries(formattedEntries);
    } catch (error) {
      console.error('Data Fetch Error 상세:', error);
      // 만약 여기서도 에러가 나면 콘솔에 찍히는 구체적인 내용을 확인해야 합니다.
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus !== 'true') {
      router.push('/admin');
      return;
    }
    fetchData();
  }, [fetchData, router]);

  // 점수 자동 저장 로직
  const handleScoreUpdate = async (user_id, field, value) => {
    const numValue = parseInt(value) || 0;
    const targetEntry = entries.find(e => e.user_id === user_id);

    try {
      if (targetEntry.score_id) {
        // 기존 점수 업데이트
        const { error } = await supabase
          .from('score')
          .update({ [field]: numValue })
          .eq('score_id', targetEntry.score_id);
        if (error) throw error;
      } else {
        // 새로운 점수 레코드 생성
        const { data, error } = await supabase
          .from('score')
          .insert([{
            user_id,
            event_id: Number(eventId),
            [field]: numValue
          }])
          .select();
        
        if (error) throw error;
        // 생성된 score_id를 로컬 상태에 업데이트 (다음 수정을 위해)
        if (data) {
          setEntries(prev => prev.map(e => 
            e.user_id === user_id ? { ...e, score_id: data[0].score_id, [field]: numValue } : e
          ));
        }
      }
      showToast(`${field.replace('game_', 'Game ')} 저장 완료`);
    } catch (error) {
      console.error('Score Update Error:', error);
    }
  };

  if (loading) return <div className="p-10 text-center font-black text-slate-400 tracking-widest">LOADING...</div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 font-sans relative">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-6 mb-10">
        <Link href="/admin/scores" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors w-fit">
          <ArrowLeft size={18} />
          <span className="text-sm font-black uppercase tracking-tighter">Back to List</span>
        </Link>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">{eventInfo?.title}</h1>
          <p className="text-slate-400 font-bold uppercase text-xs mt-1">Score Entry Table</p>
        </div>
      </div>

      {/* Score Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="p-6 w-28 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">성명</th>
              {[1, 2, 3, 4, 5].map(num => (
                <th key={num} className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Game {num}</th>
              ))}
              <th className="p-6 text-[11px] font-black text-slate-900 uppercase tracking-widest text-right bg-slate-100/30">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map((entry) => {
              const total = entry.game_1 + entry.game_2 + entry.game_3 + entry.game_4 + entry.game_5;
              
              return (
                <tr key={entry.user_id} className="hover:bg-slate-50/30 transition-all">
                  <td className="p-6 border-r border-slate-50">
                    <p className="font-black text-slate-900 text-lg">{entry.user_name}</p>
                  </td>
                  
                  {[1, 2, 3, 4, 5].map(num => (
                    <td key={num} className="p-4">
                      <input 
                        type="number"
                        defaultValue={entry[`game_${num}`]}
                        onBlur={(e) => handleScoreUpdate(entry.user_id, `game_${num}`, e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-black text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="0"
                      />
                    </td>
                  ))}

                  <td className="p-6 text-right bg-slate-50/20">
                    <span className="text-xl font-black text-blue-600">{total}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}