'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, User, Calendar, Send, CheckCircle2, Trophy, Users, Clock, UserCheck, Users2, Search, UserX } from 'lucide-react';
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
  const [isValidUser, setIsValidUser] = useState(false); // 실제 회원 여부 상태
  const [isChecking, setIsChecking] = useState(false); // 조회 중 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 1. 기초 대회 데이터 로드 (mount 시 1회)
  useEffect(() => {
    const fetchEventData = async () => {
      const { data: eventData } = await supabase
        .from('event')
        .select('event_id, title, event_date, max_people, event_pay_person, event_pay_team')
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

  // 2. 입력값에 따른 실시간 회원 검증 로직
  useEffect(() => {
    const verifyUser = async () => {
      const { name, current_id } = formData;
      
      // 두 값이 모두 입력되었을 때만 조회
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
          // 회원이면 해당 유저의 신청 내역도 가져옴
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
    }, 500); // 타자 입력 시 너무 잦은 조회를 막기 위한 0.5초 딜레이

    return () => clearTimeout(debounce);
  }, [formData.name, formData.current_id]);

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
      // 보안을 위해 최종 등록 시 다시 한번 user_id 조회
      const { data: userData } = await supabase
        .from('user')
        .select('user_id')
        .eq('name', formData.name.trim())
        .eq('current_id', formData.current_id.trim())
        .maybeSingle();

      const selectedEvent = events.find(ev => ev.event_id === formData.selected_event_id);
      let totalAmount = Number(selectedEvent.event_pay_team || 0);
      if (formData.pay_person) totalAmount += Number(selectedEvent.event_pay_person || 0);

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
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">게임 신청 완료!</h1>
        <p className="text-slate-500 font-medium leading-relaxed">
          {selectedEvent?.title} 신청이 접수되었습니다.<br />
          운영진 확인 후 최종 확정됩니다.
        </p>
        <button onClick={() => window.location.href = '/'} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg">메인으로 돌아가기</button>
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
          {/* 유저 정보 입력 섹션 */}
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
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50"
              >
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
              <motion.div 
                key="event-list"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="space-y-8"
              >
                {/* 사이드 및 대회 리스트 로직 동일 */}
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

                <button type="submit" disabled={isSubmitting || !formData.selected_event_id} className={`w-full py-6 bg-slate-900 text-white rounded-[28px] font-black text-lg shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 ${isSubmitting || !formData.selected_event_id ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}>
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