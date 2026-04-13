'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, ArrowLeft, CheckCircle2, 
  Trash2, Banknote, UserCheck, Users2, Lock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EntryManagementPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  
  const [entries, setEntries] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  };

  // 1. 신청 확정자(result: true) 기준 전체 예정 금액
  const totalAmount = entries.reduce((acc, entry) => {
    return entry.result ? acc + (Number(entry.payment_amount) || 0) : acc;
  }, 0);

  // 2. 입금 완료된 금액 중 '개인전' 합계 (확정자 기준)
  const paidPersonAmount = entries.reduce((acc, entry) => {
    if (entry.payment_status && entry.pay_person) {
      return acc + (Number(eventInfo?.event_pay_person) || 0);
    }
    return acc;
  }, 0);

  // 3. 입금 완료된 금액 중 '팀전' 합계 (확정자 기준)
  const paidTeamAmount = entries.reduce((acc, entry) => {
    if (entry.payment_status && entry.pay_team) {
      return acc + (Number(eventInfo?.event_pay_team) || 0);
    }
    return acc;
  }, 0);

  // 4. 전체 입금 완료 총액 (개인 + 팀)
  const totalPaidAmount = paidPersonAmount + paidTeamAmount;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: eventData } = await supabase.from('event').select('*').eq('event_id', eventId).single();
      setEventInfo(eventData);

      const { data: entryData, error } = await supabase
        .from('entry')
        .select(`*, user:user_id ( name )`)
        .eq('event_id', eventId);

      if (error) throw error;

      const sortedData = (entryData || []).sort((a, b) => {
        const getPriority = (item) => {
          if (!item.result) return 1;
          if (item.result && !item.payment_status) return 2;
          return 3;
        };
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        return priorityA !== priorityB ? priorityA - priorityB : a.entry_id - b.entry_id;
      });

      setEntries(sortedData);
    } catch (error) {
      showToast('데이터 로드 실패', 'error');
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

  const handleSidePayToggle = async (entry, field) => {
    // ✅ 방어 코드: 입금 완료 상태면 로직 실행 방지
    if (entry.payment_status) return;

    const nextStatus = !entry[field];
    const currentPayPerson = field === 'pay_person' ? nextStatus : entry.pay_person;
    const currentPayTeam = field === 'pay_team' ? nextStatus : entry.pay_team;

    let newAmount = 0;
    if (currentPayPerson) newAmount += Number(eventInfo.event_pay_person || 0);
    if (currentPayTeam) newAmount += Number(eventInfo.event_pay_team || 0);

    try {
      const { error } = await supabase
        .from('entry')
        .update({ [field]: nextStatus, payment_amount: newAmount })
        .eq('entry_id', entry.entry_id);

      if (error) throw error;
      showToast('금액이 갱신되었습니다.');
      fetchData();
    } catch (error) {
      showToast('갱신 실패', 'error');
    }
  };

const handleStatusToggle = async (entry, field) => {
  // 1. 인원 제한 변수 설정
  const maxCount = Number(eventInfo?.max_people || 0);
  const confirmedCount = entries.filter(e => e.result === true).length;

  // 2. 정원 초과 체크 로직
  // '미정 -> 확정'으로 바꿀 때 또는 '미정인 상태에서 입금완료'로 바꿀 때
  const isBecomingConfirmed = (field === 'result' && !entry.result) || 
                               (field === 'payment_status' && !entry.payment_status && !entry.result);

  if (isBecomingConfirmed) {
    if (maxCount > 0 && confirmedCount >= maxCount) {
      // Toast가 안 보일 수 있으므로 alert로 먼저 확인
      alert(`정원 초과! 현재 ${confirmedCount}명이 모두 찼습니다. (최대 ${maxCount}명)`);
      return; 
    }
  }

  // 3. 업데이트 데이터 구성
  let updateData = {};
  if (field === 'payment_status') {
    const nextStatus = !entry.payment_status;
    updateData = { 
      payment_status: nextStatus, 
      result: nextStatus ? true : entry.result 
    };
  } else if (field === 'result') {
    updateData = { result: !entry.result };
  }

  try {
    const { error: supabaseError } = await supabase // 변수명을 supabaseError로 명확히 변경
      .from('entry')
      .update(updateData)
      .eq('entry_id', entry.entry_id);

    if (supabaseError) throw supabaseError;
    
    showToast('상태가 변경되었습니다.');
    fetchData(); 
  } catch (err) { // 변수명을 err로 변경하여 충돌 방지
    console.error('Update Error:', err);
    alert('변경 실패: ' + (err.message || '알 수 없는 오류'));
  }
};

  const handleUpdateNote = async (entry_id, value) => {
    try {
      const { error } = await supabase.from('entry').update({ text: value }).eq('entry_id', entry_id);
      if (error) throw error;
      showToast('비고 저장 완료');
      fetchData();
    } catch (error) {
      showToast('저장 실패', 'error');
    }
  };

    const handleDeleteEntry = async (entry) => {
    // 1. 데이터 존재 확인 (디버깅용)
    if (!entry || !entry.entry_id || !entry.user_id) {
        console.error('삭제에 필요한 데이터가 부족합니다:', entry);
        showToast('데이터 오류: ID를 찾을 수 없습니다.', 'error');
        return;
    }

    if (!confirm(`${entry.user?.name || '해당'} 회원을 삭제하시겠습니까?\n삭제 시 이 대회에 등록된 점수 데이터도 모두 제거됩니다.`)) return;
    
    try {
        // 2. score 테이블에서 해당 유저의 해당 대회 점수 먼저 삭제
        const { error: scoreError } = await supabase
        .from('score')
        .delete()
        .eq('event_id', eventId) // 현재 컴포넌트 상단의 eventId 사용
        .eq('user_id', entry.user_id); // entry 객체 내부의 user_id 사용

        if (scoreError) throw scoreError;

        // 3. entry 테이블에서 신청 기록 삭제
        const { error: entryError } = await supabase
        .from('entry')
        .delete()
        .eq('entry_id', entry.entry_id);

        if (entryError) throw entryError;

        showToast('정상적으로 삭제되었습니다.');
        fetchData(); // 리스트 갱신
    } catch (error) {
        console.error('삭제 중 오류:', error.message);
        showToast('삭제 실패', 'error');
    }
    };
  if (loading) return <div className="p-10 text-center font-black text-slate-400 tracking-widest">LOADING...</div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 font-sans relative">
      {/* Toast UI 생략 */}

      {/* Header & Stats */}
      <div className="flex flex-col gap-6 mb-10">
        <Link href="/admin/events" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors w-fit">
          <ArrowLeft size={18} />
          <span className="text-sm font-black uppercase tracking-tighter">Back</span>
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 italic">{eventInfo?.title}</h1>
            <p className="text-slate-400 font-bold flex items-center gap-2 uppercase text-xs">
              <Users size={16} /> Total {entries.length} Entries
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-50 px-6 py-4 rounded-[28px] border border-slate-100 min-w-[160px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">확정자 총액</p>
              <p className="text-xl font-black text-slate-900">{totalAmount.toLocaleString()}원</p>
            </div>
            
            <div className="bg-emerald-50 px-6 py-4 rounded-[28px] border border-emerald-100 min-w-[160px]">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">개인전 입금액</p>
              <p className="text-xl font-black text-emerald-600">{paidPersonAmount.toLocaleString()}원</p>
            </div>

            <div className="bg-purple-50 px-6 py-4 rounded-[28px] border border-purple-100 min-w-[160px]">
              <p className="text-[10px] font-black text-purple-600/60 uppercase tracking-widest mb-1">팀전 입금액</p>
              <p className="text-xl font-black text-purple-600">{paidTeamAmount.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">신청자</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">사이드 참여</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">입금/확정</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">비용 및 비고</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map((entry) => (
              <tr key={entry.entry_id} className="hover:bg-slate-50/30 transition-all">
                <td className="p-6">
                  <p className="font-black text-slate-900 text-lg leading-tight">{entry.user?.name || 'Unknown'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {entry.entry_id}</p>
                </td>
                
                <td className="p-6">
                  <div className="flex justify-center gap-2">
                    {/* ✅ 방어 코드: 입금 완료 시 비활성화 */}
                    <button 
                      disabled={entry.payment_status}
                      onClick={() => handleSidePayToggle(entry, 'pay_person')}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                        entry.payment_status ? 'opacity-40 cursor-not-allowed bg-slate-50 grayscale' : ''
                      } ${
                        entry.pay_person ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-black' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      {entry.payment_status ? <Lock size={12} /> : <UserCheck size={16} />}
                      <span className="text-[9px] uppercase tracking-tighter">개인전</span>
                    </button>

                    <button 
                      disabled={entry.payment_status}
                      onClick={() => handleSidePayToggle(entry, 'pay_team')}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                        entry.payment_status ? 'opacity-40 cursor-not-allowed bg-slate-50 grayscale' : ''
                      } ${
                        entry.pay_team ? 'bg-purple-50 border-purple-200 text-purple-600 font-black' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      {entry.payment_status ? <Lock size={12} /> : <Users2 size={16} />}
                      <span className="text-[9px] uppercase tracking-tighter">팀전</span>
                    </button>
                  </div>
                </td>

                <td className="p-6">
                  <div className="flex flex-col gap-2 items-center">
                    <button 
                      onClick={() => handleStatusToggle(entry, 'payment_status')}
                      className={`w-24 py-2 rounded-xl font-black text-[10px] transition-all shadow-sm ${
                        entry.payment_status ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {entry.payment_status ? '입금완료' : '입금대기'}
                    </button>
                    <button 
                      onClick={() => handleStatusToggle(entry, 'result')}
                      className={`w-24 py-2 rounded-xl font-black text-[10px] transition-all shadow-sm ${
                        entry.result ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {entry.result ? '신청확정' : '미정'}
                    </button>
                  </div>
                </td>

                <td className="p-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 w-fit">
                      <Banknote size={14} className="text-slate-400" />
                      <span className="text-sm font-black text-slate-700">
                        {entry.payment_amount?.toLocaleString() || 0}원
                      </span>
                    </div>
                    <input 
                      type="text"
                      defaultValue={entry.text}
                      onBlur={(e) => handleUpdateNote(entry.entry_id, e.target.value)}
                      className="bg-slate-50 border-none rounded-xl px-3 py-2 text-xs text-slate-500 w-full focus:ring-1 focus:ring-slate-200"
                      placeholder="비고..."
                    />
                  </div>
                </td>

                <td className="p-6 text-right">
                <button 
                    onClick={() => handleDeleteEntry(entry)} // ✅ entry.entry_id가 아닌 entry 전체를 전달
                    className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl"
                >
                    <Trash2 size={20} />
                </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}