'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, User, Calendar, Send, CheckCircle2, Trophy, Users, Clock, UserCheck, Users2, Search, UserX, Banknote } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function GameRegistrationPage() {
  const [formData, setFormData] = useState({
    name: '',
    current_id: '',
    selected_event_id: '',
    pay_person: false,
    pay_team: true,
  });
  
  const [events, setEvents] = useState([]);
  const [userEntries, setUserEntries] = useState([]);
  const [isValidUser, setIsValidUser] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchEventData = async () => {
      const { data: eventData } = await supabase
        .from('event')
        .select('event_id, title, event_date, max_people, event_pay, event_pay_person, event_pay_team')
        .eq('end', false)
        .order('event_date', { ascending: true });

      if (eventData) {
        const { data: entryCounts } = await supabase
          .from('entry')
          .select('event_id')
          .eq('result', true);

        const eventsWithCounts = eventData.map(event => ({
          ...event,
          current_count: entryCounts?.filter(e => e.event_id === event.event_id).length || 0
        }));
        setEvents(eventsWithCounts);
      }
    };
    fetchEventData();
  }, []);

  useEffect(() => {
    const verifyUser = async () => {
      const { name, current_id } = formData;
      if (name.trim().length >= 2 && current_id.trim().length >= 2) {
        setIsChecking(true);
        const { data: userData, error } = await supabase
          .from('user')
          .select('user_id')
          .eq('name', name.trim())
          .eq('current_id', current_id.trim())
          .maybeSingle();

        if (userData && !error) {
          setIsValidUser(true);
          const { data: entries } = await supabase
            .from('entry')
            .select('event_id')
            .eq('user_id', userData.user_id);
          setUserEntries(entries?.map(e => e.event_id) || []);
        } else {
          setIsValidUser(false);
          setUserEntries([]);
        }
        setIsChecking(false);
      } else {
        setIsValidUser(false);
        setIsChecking(false);
        setFormData(prev => ({ ...prev, selected_event_id: '' }));
      }
    };

    const debounce = setTimeout(() => {
      verifyUser();
    }, 500);

    return () => clearTimeout(debounce);
  }, [formData.name, formData.current_id]);

  // 실시간 예상 금액 계산 로직
  const calculateTotalAmount = () => {
    const selectedEvent = events.find(ev => ev.event_id === formData.selected_event_id);
    if (!selectedEvent) return 0;

    let total = Number(selectedEvent.event_pay || 0) + Number(selectedEvent.event_pay_team || 0);
    if (formData.pay_person) total += Number(selectedEvent.event_pay_person || 0);
    return total;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false
    }).format(date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidUser) return alert('유효한 회원 정보가 필요합니다.');
    if (!formData.selected_event_id) return alert('신청할 대회를 선택해 주세요.');

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase
        .from('user')
        .select('user_id')
        .eq('name', formData.name.trim())
        .eq('current_id', formData.current_id.trim())
        .maybeSingle();

      const totalAmount = calculateTotalAmount();

      const { error: insertError } = await supabase
        .from('entry')
        .insert([{
          user_id: userData.user_id,
          event_id: formData.selected_event_id,
          payment_status: false,
          payment_amount: totalAmount,
          result: false,
          pay_person: formData.pay_person,
          pay_team: true,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;
      setIsSubmitted(true);
    } catch (error) {
      alert('오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    const selectedEvent = events.find(ev => ev.event_id === formData.selected_event_id);
    const finalAmount = calculateTotalAmount();

    return (
      <div className="max-w-2xl mx-auto py-20 px-6 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">게임 신청 완료!</h1>
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
          {selectedEvent?.title} 신청이 접수되었습니다.<br />
          운영진 확인 후 최종 확정됩니다.
        </p>

        {/* 입금 안내 섹션 */}
        <div className="w-full bg-slate-50 rounded-[32px] p-8 border border-slate-100 mb-8">
          <div className="flex flex-col items-center gap-2 mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">입금하실 금액</p>
            <h2 className="text-4xl font-black text-blue-600">{finalAmount.toLocaleString()}원</h2>
          </div>
          
          <div className="space-y-3 pt-6 border-t border-slate-200/60">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">입금 계좌 정보</p>
            <div className="bg-white py-4 px-6 rounded-2xl border border-slate-200">
              {/* 계좌 정보를 여기에 직접 입력하세요 */}
              <p className="font-black text-slate-800 text-lg tracking-tight">
                카카오 뱅크 3333-29-5909567
              </p>
              <p className="text-sm font-bold text-slate-500 mt-1">예금주: 이형렬</p>
            </div>
            <p className="text-[11px] text-rose-400 font-bold mt-2">
              * 반드시 신청하신 성함으로 입금해 주세요.
            </p>
          </div>
        </div>

        <button onClick={() => window.location.href = '/list'} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg">메인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-6">
      <header className="mb-8 md:mb-12 text-center md:text-left flex flex-col items-center md:items-start">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-100">
          <Trophy size={28} className="md:w-8 md:h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">게임 신청</h1>
        <p className="text-sm md:text-base text-slate-400 font-medium mt-2 md:mt-3 leading-relaxed">
          회원 인증 완료 후 <br className="md:hidden" /> 신청 가능한 대회 리스트가 노출됩니다.
        </p>
      </header>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] border border-gray-100 shadow-sm p-6 md:p-10">
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"><User size={13} /> 성함</label>
              <input required type="text" placeholder="실명 입력" className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 text-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isSubmitting} />
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"><Fingerprint size={13} /> 식별 ID</label>
              <input required type="text" placeholder="식별 ID 입력" className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 text-sm" value={formData.current_id} onChange={(e) => setFormData({...formData, current_id: e.target.value})} disabled={isSubmitting} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isValidUser ? (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50">
                {isChecking ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-bold">회원 정보 확인 중...</p>
                  </div>
                ) : formData.name.length >= 2 && formData.current_id.length >= 2 ? (
                  <div className="flex flex-col items-center gap-3">
                    <UserX size={32} className="text-rose-300" />
                    <p className="text-rose-400 text-sm font-bold">일치하는 회원 정보가 없습니다.<br/>이름과 ID를 다시 확인해 주세요.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Search size={32} className="text-slate-200" />
                    <p className="text-slate-400 text-sm font-bold">성함과 식별 ID를 입력하여<br/>본인 인증을 완료해 주세요.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="event-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8">
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사이드 참가 선택</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, pay_person: !prev.pay_person }))} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${formData.pay_person ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300'}`}><UserCheck size={20} /><span className="text-[10px] font-black uppercase">개인전 사이드</span></button>
                    <button type="button" className="py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all border-purple-500 bg-purple-50 text-purple-600 cursor-default"><Users2 size={20} /><span className="text-[10px] font-black uppercase">팀전 사이드 (필수)</span></button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"><Calendar size={13} /> 신청 가능한 대회</label>
                  <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
                    {events.map((event) => {
                      const isAlreadyApplied = userEntries.includes(event.event_id);
                      return (
                        <button
                          key={event.event_id}
                          type="button"
                          onClick={() => !isAlreadyApplied && setFormData({ ...formData, selected_event_id: event.event_id })}
                          disabled={isSubmitting || isAlreadyApplied}
                          className={`p-5 rounded-[24px] transition-all border-2 text-left flex flex-col gap-2 ${
                            formData.selected_event_id === event.event_id ? 'bg-blue-50 border-blue-600' : 
                            isAlreadyApplied ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <span className={`text-base font-black leading-tight ${formData.selected_event_id === event.event_id ? 'text-blue-600' : isAlreadyApplied ? 'text-slate-400' : 'text-slate-800'}`}>{event.title}</span>
                              {isAlreadyApplied && <span className="text-[10px] text-blue-500 font-black uppercase">[이미 신청한 대회입니다]</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2 text-slate-400 text-[10px] font-bold">
                              <Users size={12} /> {event.current_count} / {event.max_people}명
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                            <Clock size={12} /> {formatDate(event.event_date)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 하단 금액 표시 섹션 */}
                {formData.selected_event_id && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 rounded-[28px] p-6 text-white flex justify-between items-center shadow-xl shadow-slate-200">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">최종 신청 금액</p>
                      <div className="flex items-center gap-2">
                        <Banknote size={16} className="text-blue-400" />
                        <span className="text-xl font-black">{calculateTotalAmount().toLocaleString()}원</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400">기본+팀전 {formData.pay_person && '+개인전'}</p>
                    </div>
                  </motion.div>
                )}

                <button type="submit" disabled={isSubmitting || !formData.selected_event_id} className={`w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-lg shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 ${isSubmitting || !formData.selected_event_id ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}>
                  <Send size={18} /> {isSubmitting ? '신청 처리 중...' : '게임 신청하기'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}