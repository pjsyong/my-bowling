'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, ArrowLeft, CheckCircle2, 
  Trash2, Banknote, UserCheck, Users2, Lock, ChevronRight,
  Plus, Search, X, Check // <--- 이 아이콘들을 추가하세요
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addForm, setAddForm] = useState({ pay_person: false, pay_team: false });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  };

  // --- 내부 로직 유지 (원본 코드와 동일) ---
  const totalAmount = entries.reduce((acc, entry) => {
    return entry.result ? acc + (Number(entry.payment_amount) || 0) : acc;
  }, 0);

  const paidPersonAmount = entries.reduce((acc, entry) => {
    if (entry.payment_status && entry.pay_person) {
      return acc + (Number(eventInfo?.event_pay_person) || 0);
    }
    return acc;
  }, 0);

  const paidTeamAmount = entries.reduce((acc, entry) => {
    if (entry.payment_status && entry.pay_team) {
      return acc + (Number(eventInfo?.event_pay_team) || 0);
    }
    return acc;
  }, 0);

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
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || user.email !== 'injeong@gmail.com') {
        alert('관리자 인증이 필요합니다.');
        router.push('/admin');
        return;
      }
      fetchData();
    };
    checkAuth();
  }, [router, fetchData]);

  const handleSidePayToggle = async (entry, field) => {
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

  const handleSearchUser = async () => {
    if (!searchName.trim()) return;
    const { data, error } = await supabase
      .from('user_public')
      .select('user_id, name')
      .ilike('name', `%${searchName}%`)
      .limit(5);
    
    if (error) showToast('유저 검색 실패', 'error');
    else setSearchResults(data || []);
  };

  // entry 테이블에 최종 추가하는 로직
  const handleAddEntry = async () => {
    if (!selectedUser) return alert('회원을 선택해주세요.');
    

    if (entries.length >= 30) {
      alert('최대 인원(30명)이 이미 도달하여 더 이상 추가할 수 없습니다.');
      return;
    }
    // --- 중복 체크 로직 추가 ---
    const isAlreadyAdded = entries.some(entry => entry.user_id === selectedUser.user_id);
    if (isAlreadyAdded) {
      alert('이미 이 대회에 등록된 회원입니다.');
      return;
    }
    // -------------------------

    let payment_amount = 0;
    if (addForm.pay_person) payment_amount += Number(eventInfo.event_pay_person || 0);
    if (addForm.pay_team) payment_amount += Number(eventInfo.event_pay_team || 0);

    try {
      const { error } = await supabase.from('entry').insert({
        event_id: eventId,
        user_id: selectedUser.user_id,
        pay_person: addForm.pay_person,
        pay_team: addForm.pay_team,
        payment_amount: payment_amount,
        payment_status: false,
        result: false
      });

      if (error) {
        // 데이터베이스 레벨의 중복 제약 조건(Unique Violation) 처리
        if (error.code === '23505') throw new Error('이미 등록된 회원입니다.');
        throw error;
      }

      showToast('참가자가 추가되었습니다.');
      setIsAddModalOpen(false);
      resetAddForm();
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const resetAddForm = () => {
    setSearchName('');
    setSearchResults([]);
    setSelectedUser(null);
    setAddForm({ pay_person: false, pay_team: false });
  };
  const handleStatusToggle = async (entry, field) => {
    const maxCount = Number(eventInfo?.max_people || 0);
    const confirmedCount = entries.filter(e => e.result === true).length;
    const isBecomingConfirmed = (field === 'result' && !entry.result) || 
                                 (field === 'payment_status' && !entry.payment_status && !entry.result);

    if (isBecomingConfirmed) {
      if (maxCount > 0 && confirmedCount >= maxCount) {
        alert(`정원 초과! 현재 ${confirmedCount}명이 모두 찼습니다. (최대 ${maxCount}명)`);
        return; 
      }
    }

    let updateData = {};
    if (field === 'payment_status') {
      const nextStatus = !entry.payment_status;
      updateData = { payment_status: nextStatus, result: nextStatus ? true : entry.result };
    } else if (field === 'result') {
      updateData = { result: !entry.result };
    }

    try {
      const { error: supabaseError } = await supabase
        .from('entry')
        .update(updateData)
        .eq('entry_id', entry.entry_id);
      if (supabaseError) throw supabaseError;
      showToast('상태가 변경되었습니다.');
      fetchData(); 
    } catch (err) {
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
    if (!entry || !entry.entry_id || !entry.user_id) return;
    if (!confirm(`${entry.user?.name || '해당'} 회원을 삭제하시겠습니까?`)) return;
    try {
      await supabase.from('score').delete().eq('event_id', eventId).eq('user_id', entry.user_id);
      await supabase.from('entry').delete().eq('entry_id', entry.entry_id);
      showToast('정상적으로 삭제되었습니다.');
      fetchData();
    } catch (error) {
      showToast('삭제 실패', 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse font-black text-slate-300 tracking-widest text-xl">LOADING...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Toast (간이 구현) */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold text-sm transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/admin/events" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        
        <h1 className="text-lg font-black text-slate-900 truncate px-4">{eventInfo?.title}</h1>
        
        {/* 우측 공백(w-10) 대신 아래 버튼을 넣으세요 */}
        <button 
          type="button"
          // entries.length가 30 이상이면 버튼 비활성화
          disabled={entries.length >= 30}
          onClick={() => setIsAddModalOpen(true)}
          className={`p-2 -mr-2 transition-all ${
            entries.length >= 30 
            ? 'text-slate-200 cursor-not-allowed opacity-50' // 꽉 찼을 때 스타일
            : 'text-slate-900 active:scale-90 hover:text-blue-600' // 클릭 가능할 때 스타일
          }`}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>
    </div>

      

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Section - Grid Optimized for Mobile */}
        <div className="grid grid-cols-12 gap-3">
        {/* 총 신청 인원: 12칸 중 3칸만 차지 (너비 축소) */}
        <div className="col-span-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">인원</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900">{entries.length}</span>
            <span className="text-xs font-bold text-slate-400">명</span>
          </div>
        </div>

        {/* 확정 총액: 12칸 중 4칸 차지 */}
        <div className="col-span-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">확정 총액</p>
          <p className="text-sm font-black text-slate-900 leading-tight truncate">
            {totalAmount.toLocaleString()}원
          </p>
        </div>

        {/* 실 입금액: 12칸 중 4칸 차지 (강조) */}
        <div className="col-span-4 bg-emerald-500 p-4 rounded-[24px] shadow-lg shadow-emerald-100 flex flex-col justify-center min-w-0">
          <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 truncate">실 입금액</p>
          <p className="text-sm font-black text-white leading-tight truncate">
            {totalPaidAmount.toLocaleString()}원
          </p>
        </div>
      </div>

        {/* Entry List - Card Layout */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Entry List</h2>
            <div className="flex gap-2 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> 입금</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600" /> 확정</span>
            </div>
          </div>

          {entries.map((entry) => (
            <div key={entry.entry_id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all active:scale-[0.98]">
              <div className="p-5 space-y-4">
                {/* Card Top: User Info & Actions */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-1">{entry.user?.name || 'Unknown'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {entry.entry_id}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteEntry(entry)}
                    className="p-3 -mr-2 text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Card Middle: Side Buttons & Amount */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex gap-2">
                    <button 
                      disabled={entry.payment_status}
                      onClick={() => handleSidePayToggle(entry, 'pay_person')}
                      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${
                        entry.payment_status ? 'bg-slate-50 border-transparent opacity-40' : 
                        entry.pay_person ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      {entry.payment_status ? <Lock size={14} /> : <UserCheck size={18} />}
                      <span className="text-[10px] font-black uppercase tracking-tighter">개인전</span>
                    </button>
                    <button 
                      disabled={entry.payment_status}
                      onClick={() => handleSidePayToggle(entry, 'pay_team')}
                      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${
                        entry.payment_status ? 'bg-slate-50 border-transparent opacity-40' : 
                        entry.pay_team ? 'bg-purple-50 border-purple-200 text-purple-600 ring-2 ring-purple-100' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      {entry.payment_status ? <Lock size={14} /> : <Users2 size={18} />}
                      <span className="text-[10px] font-black uppercase tracking-tighter">팀전</span>
                    </button>
                  </div>
                  <div className="bg-slate-100 px-4 py-4 rounded-2xl border border-slate-200 min-w-[100px] text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">금액</p>
                    <p className="text-sm font-black text-slate-700">{(entry.payment_amount || 0).toLocaleString()}원</p>
                  </div>
                </div>

                {/* Card Bottom: Status Controls & Note */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleStatusToggle(entry, 'payment_status')}
                    className={`py-3.5 rounded-2xl font-black text-xs transition-all shadow-sm ${
                      entry.payment_status ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {entry.payment_status ? '입금완료' : '입금대기'}
                  </button>
                  <button 
                    onClick={() => handleStatusToggle(entry, 'result')}
                    className={`py-3.5 rounded-2xl font-black text-xs transition-all shadow-sm ${
                      entry.result ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {entry.result ? '신청확정' : '미정'}
                  </button>
                </div>

                {/* Note Input */}
                <div className="relative">
                  <input 
                    type="text"
                    defaultValue={entry.text}
                    onBlur={(e) => handleUpdateNote(entry.entry_id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="비고 사항 입력..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">신규 인원 추가</h2>
                <button 
                  onClick={() => { setIsAddModalOpen(false); resetAddForm(); }} 
                  className="p-2 bg-slate-50 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 검색창 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">회원 검색</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="이름 입력..."
                      className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                    />
                    <button onClick={handleSearchUser} className="bg-slate-900 text-white px-4 rounded-2xl">
                      <Search size={18} />
                    </button>
                  </div>
                  {/* 검색 결과 목록 */}
                  {searchResults.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-2 mt-2 space-y-1">
                      {searchResults.map(user => (
                        <button 
                          key={user.user_id}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all ${selectedUser?.user_id === user.user_id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/50'}`}
                        >
                          <span className="font-bold text-slate-700">{user.name}</span>
                          {selectedUser?.user_id === user.user_id && <Check size={16} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 참여 선택 토글 */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAddForm(prev => ({ ...prev, pay_person: !prev.pay_person }))}
                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${addForm.pay_person ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300'}`}
                  >
                    <UserCheck size={20} />
                    <span className="text-[10px] font-black uppercase">개인전</span>
                  </button>
                  <button 
                    onClick={() => setAddForm(prev => ({ ...prev, pay_team: !prev.pay_team }))}
                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${addForm.pay_team ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-300'}`}
                  >
                    <Users2 size={20} />
                    <span className="text-[10px] font-black uppercase">팀전</span>
                  </button>
                </div>

                <button 
                  onClick={handleAddEntry}
                  disabled={entries.length >= 30}
                  className={`w-full py-4 rounded-[20px] font-black text-sm mt-4 shadow-xl transition-all ${
                    entries.length >= 30 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white active:scale-95'
                  }`}
                >
                  {entries.length >= 30 ? '정원이 가득 찼습니다' : '참가자 확정 등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}