'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, Check, UserCheck, Users2, Plus, X, Phone, User, AlertCircle, Banknote, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage({ params }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [entries, setEntries] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    user_phone: '',
    pay_person: false,
    pay_team: true 
  });

  const fetchEventData = async () => {
    try {
      // 1. 대회 정보
      const { data: eventData } = await supabase
        .from('event')
        .select('*')
        .eq('event_id', eventId)
        .single();
      setEventInfo(eventData);

      // 2. 신청 명단 가져오기
      const { data: entryData, error: entryError } = await supabase
        .from('entry')
        .select('*')
        .eq('event_id', eventId);

      if (entryError) throw entryError;

      // 3. ✅ 신청 유저 정보 가져오기 (type_pro 컬럼 추가)
      const userIds = entryData.map(e => e.user_id);
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('user_id, name, phone, type_pro') // type_pro 필드 추가
        .in('user_id', userIds);

      if (userError) throw userError;

      // 4. 데이터 병합
      const combinedData = entryData.map(entry => ({
        ...entry,
        user: userData.find(u => u.user_id === entry.user_id) || null
      }));

      // 정렬: 입금 여부 -> 확정 여부 -> 순번
      const sortedData = combinedData.sort((a, b) => {
        if (a.payment_status !== b.payment_status) return a.payment_status ? -1 : 1;
        if (a.result !== b.result) return a.result ? -1 : 1;
        return a.entry_id - b.entry_id;
      });

      setEntries(sortedData);
    } catch (error) {
      console.error('데이터 로드 오류:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const maskPhoneNumber = (phone) => {
    if (!phone) return '번호 없음';
    const pure = phone.replace(/[^0-9]/g, '');
    if (pure.length >= 10) {
      return `${pure.substring(0, 3)}-****-${pure.substring(pure.length - 4)}`;
    }
    return phone;
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', 
      weekday: 'long', hour: '2-digit', hour12: false 
    }).format(date);
  };

  const calculateTotal = () => {
    let total = 0;
    if (formData.pay_team) total += (eventInfo?.event_pay_team || 0);
    if (formData.pay_person) total += (eventInfo?.event_pay_person || 0);
    return total;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;
    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setFormData({ ...formData, user_phone: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // 1. 유저 정보 및 승인 상태 조회
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('user_id, official')
        .eq('name', formData.user_name.trim())
        .eq('phone', formData.user_phone.trim())
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        alert('회원 정보를 찾을 수 없습니다. 먼저 회원 등록을 진행해 주세요.');
        setIsSubmitting(false);
        return;
      }

      if (userData.official === false) {
        alert('회원 등록 승인 대기 중입니다. 운영진의 승인 후 대회 신청이 가능합니다.');
        setIsSubmitting(false);
        return;
      }

      // 2. ✅ [추가] 중복 신청 확인
      const { data: existingEntry, error: entryCheckError } = await supabase
        .from('entry')
        .select('entry_id')
        .eq('event_id', eventId)
        .eq('user_id', userData.user_id)
        .maybeSingle();

      if (entryCheckError) throw entryCheckError;

      if (existingEntry) {
        alert('이미 이 대회에 신청하셨습니다. 명단에서 본인의 이름을 확인해 주세요.');
        setIsSubmitting(false);
        return;
      }

      // 3. 신청 데이터 삽입
      const { error: insertError } = await supabase.from('entry').insert([
        {
          event_id: eventId,
          user_id: userData.user_id,
          pay_person: formData.pay_person,
          pay_team: formData.pay_team,
          payment_amount: calculateTotal(),
          payment_status: false,
          result: false
        }
      ]);

      if (insertError) {
        // DB 제약조건(Unique)으로 인한 에러 처리
        if (insertError.code === '23505') alert('이미 신청되었습니다.');
        else throw insertError;
      } else {
        alert('신청 완료!');
        setIsModalOpen(false);
        setFormData({ user_name: '', user_phone: '', pay_person: false, pay_team: true });
        fetchEventData();
      }
    } catch (error) {
      alert('오류 발생: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmedCount = entries.filter(entry => entry.result).length;
  const maxCount = eventInfo?.max_people || 0;

  if (loading) return <div className="p-10 text-center font-black text-slate-400 italic text-xl">데이터 로딩 중...</div>;

  return (
    <section className="max-w-6xl mx-auto py-12 px-6 font-sans text-slate-900">
      <div className="flex justify-between items-start mb-8">
        <Link href="/list" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          대회 목록
        </Link>
        {!eventInfo.end && (
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
            <Plus size={20} /> 참가 신청
          </button>
        )}
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest ${eventInfo.end ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {eventInfo.end ? '모집 마감' : '모집 중'}
              </span>
              <p className="text-slate-500 text-sm font-bold flex items-center gap-1.5"><Calendar size={16} className="text-blue-500" />{formatEventDate(eventInfo.event_date)}</p>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">{eventInfo.title}</h1>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-50 px-8 py-5 rounded-[24px] border border-slate-100 text-right min-w-[140px]">
              <p className="text-slate-400 text-[10px] font-black mb-1">총 신청</p>
              <p className="text-3xl font-black text-slate-900">{entries.length}명</p>
            </div>
            <div className="bg-blue-600 px-8 py-5 rounded-[24px] text-right min-w-[160px] shadow-lg shadow-blue-100 text-white">
              <p className="text-blue-200 text-[10px] font-black mb-1">신청 완료</p>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-3xl font-black">{confirmedCount}</span>
                <span className="text-blue-200 text-sm font-bold">/ {maxCount}명</span>
              </div>
            </div>
          </div>
        </div>
        {maxCount > 0 && (
          <div className="mt-8 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((confirmedCount / maxCount) * 100, 100)}%` }} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-20">순번</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">이름</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">참여 구분</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">전화번호</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">입금 금액</th>
              <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">상태</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry, index) => (
                <tr key={entry.entry_id} className="border-b border-slate-50 last:border-none hover:bg-slate-50/30 transition-colors">
                  <td className="p-6"><span className="text-slate-300 font-black italic">{index + 1}</span></td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-slate-800 tracking-tight">{entry.user?.name || '정보 없음'}</p>
                      {/* ✅ PRO 태그 렌더링 부분 */}
                      {entry.user?.type_pro === 1 && (
                        <span className="flex items-center gap-0.5 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black italic tracking-tighter">
                          <ShieldCheck size={10} className="text-blue-400" /> PRO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                        {entry.pay_team && <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl border border-purple-100 text-[10px] font-black uppercase"><Users2 size={12} /> 팀전</div>}
                        {entry.pay_person && <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-100 text-[10px] font-black uppercase"><UserCheck size={12} /> 개인전</div>}
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-sm font-bold text-slate-500 tracking-wider">
                      {entry.user ? maskPhoneNumber(entry.user.phone) : '번호 없음'}
                    </p>
                  </td>
                  <td className="p-6 text-right font-black text-slate-700 italic text-lg">
                    {entry.payment_amount?.toLocaleString() || 0}원
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {entry.result && (
                        entry.payment_status ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 italic"><Check size={12} /> 입금 완료</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 italic"><AlertCircle size={12} /> 미입금</span>
                        )
                      )}
                      <div className="font-black text-sm italic uppercase tracking-tighter">
                        {entry.result ? <span className="text-indigo-600">신청 확정</span> : <span className="text-slate-300">승인 대기</span>}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="p-20 text-center text-slate-300 font-bold italic">신청자가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black italic tracking-tighter text-slate-900">참가 신청</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">이름</label>
                  <input required type="text" placeholder="이름 입력" value={formData.user_name} onChange={(e) => setFormData({...formData, user_name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">연락처</label>
                  <input required type="text" maxLength="13" placeholder="010-0000-0000" value={formData.user_phone} onChange={handlePhoneChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">참여 항목</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black bg-purple-600 text-white shadow-lg shadow-purple-100"><Users2 size={18} /> 팀전</div>
                  <button type="button" onClick={() => setFormData({...formData, pay_person: !formData.pay_person})} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all border-2 ${formData.pay_person ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-300'}`}><UserCheck size={18} /> 개인전</button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-3xl p-6 text-white relative">
                <p className="text-[10px] font-black text-slate-400 mb-1">최종 입금 금액</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black italic">{calculateTotal().toLocaleString()}</span>
                  <span className="text-sm font-bold">원</span>
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black italic hover:bg-blue-700 transition-all disabled:opacity-50">
                {isSubmitting ? '처리 중...' : '참가 신청 완료'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}