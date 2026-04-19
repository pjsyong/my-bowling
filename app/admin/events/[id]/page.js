'use client';

import React, { useState, useEffect, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Users, ArrowLeft, CheckCircle2, 
  Trash2, Banknote, UserCheck, Users2, Lock, ChevronRight,
  Plus, Search, X, Check, Share2 // Share2 아이콘 추가
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EntryManagementPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addForm, setAddForm] = useState({ pay_person: false, pay_team: false });

  // 카카오 SDK 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Kakao?.isInitialized()) {
      const script = document.createElement('script');
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js';
      script.async = true;
      script.onload = () => {
        window.Kakao.init('ccf6442364ce1904b9db1eee04ae35a6'); // 여기에 본인의 자바스크립트 키를 넣으세요
      };
      document.head.appendChild(script);
    }
  }, []);

  const { data: { eventInfo, entries } = { eventInfo: null, entries: [] }, isLoading: loading } = useQuery({
    queryKey: ['admin-entries', eventId],
    queryFn: async () => {
      const { data: eventData } = await supabase.from('event').select('*').eq('event_id', eventId).single();
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
        return getPriority(a) - getPriority(b) || a.entry_id - b.entry_id;
      });

      return { eventInfo: eventData, entries: sortedData };
    },
    staleTime: 0,
  });

  // 카카오톡 공유 함수
  const shareToKakao = () => {
    const unpaidEntries = entries.filter(e => !e.payment_status);
    if (unpaidEntries.length === 0) return showToast('모두 입금 완료되었습니다! 👏');

    // 금액 제외, 이름만 추출하여 나열
    const nameList = unpaidEntries.map(e => e.user?.name).join(', ');

    // 사용자용 상세 페이지 링크 (필요 시 수정 가능)
    const userPageUrl = "https://my-home-t83e.vercel.app/money"; 

    window.Kakao.Share.sendDefault({
      objectType: 'list',
      headerTitle: `🎳 ${eventInfo?.title} 입금 안내`,
      headerLink: { mobileWebUrl: userPageUrl, webUrl: userPageUrl },
      contents: [
        {
          title: '미입금 인원 현황',
          description: `현재 ${unpaidEntries.length}명이 미입금 상태입니다.`,
          imageUrl: 'https://cdn-icons-png.flaticon.com/512/3390/3390440.png',
          link: { mobileWebUrl: userPageUrl, webUrl: userPageUrl },
        },
        {
          title: '미입금자 명단',
          description: nameList, // 이름만 노출하여 카드 사이즈 최적화
          imageUrl: 'https://cdn-icons-png.flaticon.com/512/694/694642.png',
          link: { mobileWebUrl: userPageUrl, webUrl: userPageUrl },
        }
      ],
      buttons: [
        {
          title: '내 신청내역 확인하기',
          link: { 
            mobileWebUrl: userPageUrl, // 개별 링크 설정 가능
            webUrl: userPageUrl 
          },
        }
      ],
    });
  };

  // --- 이하 기존 로직 동일 (생략) ---
  const confirmedEntries = entries.filter(e => e.result);
  const totalBasePay = confirmedEntries.length * (Number(eventInfo?.event_pay) || 0);
  const totalPersonPay = confirmedEntries.reduce((acc, e) => e.pay_person ? acc + (Number(eventInfo?.event_pay_person) || 0) : acc, 0);
  const totalTeamPay = confirmedEntries.reduce((acc, e) => e.pay_team ? acc + (Number(eventInfo?.event_pay_team) || 0) : acc, 0);
  const totalAmount = totalBasePay + totalPersonPay + totalTeamPay;
  const totalPaidAmount = entries.reduce((acc, entry) => entry.payment_status ? acc + (Number(entry.payment_amount) || 0) : acc, 0);
  
  const refreshData = () => queryClient.invalidateQueries({ queryKey: ['admin-entries', eventId] });

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

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  };

  const [isToggling, setIsToggling] = useState(null);
  const handleSidePayToggle = async (entry, field) => {
    if (entry.payment_status || isToggling === entry.entry_id) return;
    setIsToggling(entry.entry_id);
    const nextStatus = !entry[field];
    const finalPayPerson = field === 'pay_person' ? nextStatus : entry.pay_person;
    const finalPayTeam = field === 'pay_team' ? nextStatus : entry.pay_team;
    let newAmount = Number(eventInfo?.event_pay || 0);
    if (finalPayPerson) newAmount += Number(eventInfo?.event_pay_person || 0);
    if (finalPayTeam) newAmount += Number(eventInfo?.event_pay_team || 0);
    try {
      const { error } = await supabase.from('entry').update({ [field]: nextStatus, payment_amount: newAmount }).eq('entry_id', entry.entry_id);
      if (error) throw error;
      showToast('금액이 갱신되었습니다.');
      await queryClient.invalidateQueries({ queryKey: ['admin-entries', eventId] });
    } catch (e) { showToast('갱신 실패', 'error'); } finally { setIsToggling(null); }
  };

  const handleSearchUser = async () => {
    if (!searchName.trim()) return;
    const { data, error } = await supabase.from('user_public').select('user_id, name').ilike('name', `%${searchName}%`).limit(5);
    if (error) showToast('유저 검색 실패', 'error');
    else setSearchResults(data || []);
  };

  const handleAddEntry = async () => {
    if (!selectedUser) return alert('회원을 선택해주세요.');
    if (entries.length >= 30) return alert('최대 인원 초과');
    const isAlreadyAdded = entries.some(entry => entry.user_id === selectedUser.user_id);
    if (isAlreadyAdded) return alert('이미 등록된 회원입니다.');
    let payment_amount = Number(eventInfo?.event_pay || 0);
    if (addForm.pay_person) payment_amount += Number(eventInfo.event_pay_person || 0);
    if (addForm.pay_team) payment_amount += Number(eventInfo.event_pay_team || 0);
    try {
      const { error } = await supabase.from('entry').insert({
        event_id: eventId, user_id: selectedUser.user_id, pay_person: addForm.pay_person,
        pay_team: addForm.pay_team, payment_amount: payment_amount, payment_status: false, result: false
      });
      if (error) throw error;
      showToast('참가자가 추가되었습니다.');
      setIsAddModalOpen(false);
      resetAddForm();
      refreshData();
    } catch (error) { alert(error.message); }
  };

  const resetAddForm = () => {
    setSearchName(''); setSearchResults([]); setSelectedUser(null);
    setAddForm({ pay_person: false, pay_team: false });
  };

  const handleStatusToggle = async (entry, field) => {
    const maxCount = Number(eventInfo?.max_people || 0);
    const confirmedCount = entries.filter(e => e.result === true).length;
    const isBecomingConfirmed = (field === 'result' && !entry.result) || (field === 'payment_status' && !entry.payment_status && !entry.result);
    if (isBecomingConfirmed && maxCount > 0 && confirmedCount >= maxCount) { alert(`정원 초과! (최대 ${maxCount}명)`); return; }
    let updateData = {};
    if (field === 'payment_status') {
      const nextStatus = !entry.payment_status;
      updateData = { payment_status: nextStatus, result: nextStatus ? true : entry.result };
    } else if (field === 'result') { updateData = { result: !entry.result }; }
    try {
      const { error: supabaseError } = await supabase.from('entry').update(updateData).eq('entry_id', entry.entry_id);
      if (supabaseError) throw supabaseError;
      showToast('상태가 변경되었습니다.');
      refreshData(); 
    } catch (err) { alert('변경 실패: ' + err.message); }
  };

  const handleUpdateNote = async (entry_id, value) => {
    try {
      const { error } = await supabase.from('entry').update({ text: value }).eq('entry_id', entry_id);
      if (error) throw error;
      showToast('비고 저장 완료');
      refreshData();
    } catch (error) { showToast('저장 실패', 'error'); }
  };

  const handleDeleteEntry = async (entry) => {
    if (!confirm(`${entry.user?.name} 회원을 삭제하시겠습니까?`)) return;
    try {
      await supabase.from('score').delete().eq('event_id', eventId).eq('user_id', entry.user_id);
      await supabase.from('entry').delete().eq('entry_id', entry.entry_id);
      showToast('정상적으로 삭제되었습니다.');
      refreshData();
    } catch (error) { showToast('삭제 실패', 'error'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse font-black text-slate-300 tracking-widest text-xl">LOADING...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold text-sm transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 헤더 섹션: 공유하기 버튼 추가됨 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin/events" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-black text-slate-900 truncate px-4">{eventInfo?.title}</h1>
          <div className="flex items-center gap-1">
            {/* 공유하기 버튼 */}
            <button 
              onClick={shareToKakao}
              className="p-2 text-slate-900 active:scale-90 transition-transform"
              title="미입금자 공유"
            >
              <Share2 size={24} strokeWidth={2.5} />
            </button>
            {/* 추가 버튼 */}
            <button 
              disabled={entries.length >= 30}
              onClick={() => setIsAddModalOpen(true)}
              className={`p-2 -mr-2 transition-all ${entries.length >= 30 ? 'text-slate-200 opacity-50' : 'text-slate-900 active:scale-90'}`}
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 기존 통계 및 리스트 코드 동일 */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">인원</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">{entries.length}</span>
              <span className="text-xs font-bold text-slate-400">명</span>
            </div>
          </div>
          <div className="col-span-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">확정 총액</p>
            <p className="text-sm font-black text-slate-900 truncate">{totalAmount.toLocaleString()}원</p>
          </div>
          <div className="col-span-4 bg-emerald-500 p-4 rounded-[24px] shadow-lg shadow-emerald-100">
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">실 입금액</p>
            <p className="text-sm font-black text-white truncate">{totalPaidAmount.toLocaleString()}원</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-1">
          <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">기본 게임</p>
            <p className="text-xs font-black text-slate-600">{totalBasePay.toLocaleString()}원</p>
          </div>
          <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
            <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1">개인 사이드</p>
            <p className="text-xs font-black text-indigo-600">{totalPersonPay.toLocaleString()}원</p>
          </div>
          <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
            <p className="text-[9px] font-bold text-purple-400 uppercase mb-1">팀전 금액</p>
            <p className="text-xs font-black text-purple-600">{totalTeamPay.toLocaleString()}원</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Entry List</h2>
          </div>
          {entries.map((entry) => (
            <div key={entry.entry_id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-1">{entry.user?.name || 'Unknown'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {entry.entry_id}</p>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry)} className="p-3 -mr-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex gap-2">
                    <button disabled={entry.payment_status || isToggling === entry.entry_id} onClick={() => handleSidePayToggle(entry, 'pay_person')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${entry.payment_status ? 'bg-slate-50 opacity-40' : entry.pay_person ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100' : 'bg-white border-slate-100 text-slate-300'}`}>{entry.payment_status ? <Lock size={14} /> : <UserCheck size={18} />}<span className="text-[10px] font-black uppercase tracking-tighter">개인전</span></button>
                    <button disabled={entry.payment_status || isToggling === entry.entry_id} onClick={() => handleSidePayToggle(entry, 'pay_team')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${entry.payment_status ? 'bg-slate-50 opacity-40' : entry.pay_team ? 'bg-purple-50 border-purple-200 text-purple-600 ring-2 ring-purple-100' : 'bg-white border-slate-100 text-slate-300'}`}>{entry.payment_status ? <Lock size={14} /> : <Users2 size={18} />}<span className="text-[10px] font-black uppercase tracking-tighter">팀전</span></button>
                  </div>
                  <div className="bg-slate-100 px-4 py-4 rounded-2xl border border-slate-200 min-w-[100px] text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">금액</p>
                    <p className="text-sm font-black text-slate-700">{(entry.payment_amount || 0).toLocaleString()}원</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleStatusToggle(entry, 'payment_status')} className={`py-3.5 rounded-2xl font-black text-xs transition-all ${entry.payment_status ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{entry.payment_status ? '입금완료' : '입금대기'}</button>
                  <button onClick={() => handleStatusToggle(entry, 'result')} className={`py-3.5 rounded-2xl font-black text-xs transition-all ${entry.result ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{entry.result ? '신청확정' : '미정'}</button>
                </div>
                <input type="text" defaultValue={entry.text} onBlur={(e) => handleUpdateNote(entry.entry_id, e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200 outline-none" placeholder="비고 사항 입력..." />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">신규 인원 추가</h2>
                <button onClick={() => { setIsAddModalOpen(false); resetAddForm(); }} className="p-2 bg-slate-50 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">회원 검색</label>
                  <div className="flex gap-2">
                    <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="이름 입력..." className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm" />
                    <button onClick={handleSearchUser} className="bg-slate-900 text-white px-4 rounded-2xl"><Search size={18} /></button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-2 mt-2 space-y-1">
                      {searchResults.map(user => (
                        <button key={user.user_id} onClick={() => setSelectedUser(user)} className={`w-full flex justify-between items-center px-4 py-3 rounded-xl ${selectedUser?.user_id === user.user_id ? 'bg-white shadow-sm ring-1 ring-slate-200' : ''}`}>
                          <span className="font-bold text-slate-700">{user.name}</span>
                          {selectedUser?.user_id === user.user_id && <Check size={16} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setAddForm(prev => ({ ...prev, pay_person: !prev.pay_person }))} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${addForm.pay_person ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300'}`}><UserCheck size={20} /><span className="text-[10px] font-black uppercase">개인전</span></button>
                  <button onClick={() => setAddForm(prev => ({ ...prev, pay_team: !prev.pay_team }))} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${addForm.pay_team ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-300'}`}><Users2 size={20} /><span className="text-[10px] font-black uppercase">팀전</span></button>
                </div>
                <button onClick={handleAddEntry} disabled={entries.length >= 30} className="w-full py-4 rounded-[20px] font-black text-sm mt-4 shadow-xl bg-slate-900 text-white active:scale-95 disabled:bg-slate-200">참가자 확정 등록</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}