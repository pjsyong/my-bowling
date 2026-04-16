'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Pencil, Trash2, ArrowLeft, 
  CheckCircle2, Users, Calendar,
  UserCheck, Users2, AlertCircle, Clock, Banknote, X, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventManagementPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- [원본 로직 100% 유지] ---
  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const formatForInput = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.replace('Z', '').split('.')[0].slice(0, 16);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  };

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'WED',
    event_date: new Date().toISOString().slice(0, 16),
    event_pay_person: 0,
    event_pay_team: 0,
    max_people: 20,
    progress: true,
    end: false,
    ratio_1: 50,
    ratio_2: 30,
    ratio_3: 20,
    frame: 4
  });

  const fetchEvents = useCallback(async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('event')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (eventError) throw eventError;

      const eventsWithStats = await Promise.all((eventData || []).map(async (event) => {
        const { data: entries, error: entryError } = await supabase
          .from('entry')
          .select('result, payment_status')
          .eq('event_id', event.event_id);

        if (entryError) return { ...event, waitingCount: 0, confirmedCount: 0, pendingPaymentCount: 0 };

        const waiting = entries.filter(e => !e.result).length;
        const confirmed = entries.filter(e => e.result).length;
        const pendingPayment = entries.filter(e => e.result && !e.payment_status).length;

        return {
          ...event,
          waitingCount: waiting,
          confirmedCount: confirmed,
          pendingPaymentCount: pendingPayment
        };
      }));

      setEvents(eventsWithStats);
    } catch (error) {
      console.error('데이터 로드 에러:', error);
      showToast('데이터를 불러오지 못했습니다.', 'error');
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || user.email !== 'injeong@gmail.com') {
        alert('관리자 인증이 필요합니다.');
        router.push('/admin');
        return;
      }
      fetchEvents();
    };
    checkAuth();
  }, [router, fetchEvents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalRatio = Number(formData.ratio_1 || 0) + Number(formData.ratio_2 || 0) + Number(formData.ratio_3 || 0);
    if (totalRatio !== 100) {
      showToast('상금 배분율의 합계가 100%여야 합니다.', 'error');
      return;
    }
    try {
      const submitData = {
        title: formData.title,
        event_type: formData.event_type,
        event_date: formData.event_date,
        event_pay_person: parseInt(formData.event_pay_person || 0),
        event_pay_team: parseInt(formData.event_pay_team || 0),
        max_people: parseInt(formData.max_people),
        progress: formData.progress,
        end: formData.end,
        ratio_1: parseInt(formData.ratio_1 || 0),
        ratio_2: parseInt(formData.ratio_2 || 0),
        ratio_3: parseInt(formData.ratio_3 || 0),
        frame: parseInt(formData.frame || 1)
      };
      if (editingEvent) {
        const { error } = await supabase.from('event').update(submitData).eq('event_id', Number(editingEvent.event_id));
        if (error) throw error;
        showToast('수정되었습니다.');
      } else {
        const { error } = await supabase.from('event').insert([submitData]);
        if (error) throw error;
        showToast('등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    try {
      const eventId = Number(id);
      await supabase.from('score').delete().eq('event_id', eventId);
      await supabase.from('entry').delete().eq('event_id', eventId);
      const { error } = await supabase.from('event').delete().eq('event_id', eventId);
      if (error) throw error;
      showToast('삭제되었습니다.');
      fetchEvents();
    } catch (error) {
      showToast('삭제 실패: ' + error.message, "error");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 pb-32 px-5 font-sans bg-white min-h-screen">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[130] w-[90%] max-w-xs animate-in fade-in slide-in-from-top-4">
          <div className={`px-5 py-3 rounded-2xl shadow-xl font-black text-white flex items-center gap-2 text-xs ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-500'}`}>
            <CheckCircle2 size={16} />
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest mb-6">
          <ArrowLeft size={12} /> Admin Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Event Hub</h1>
            <p className="text-slate-400 text-[11px] font-bold mt-2 uppercase tracking-widest">Manage All Events</p>
          </div>
          <button 
            onClick={() => {
              setEditingEvent(null);
              setFormData({ 
                title: '', event_type: 'WED', event_date: formatDateTimeLocal(new Date()),
                event_pay_person: 0, event_pay_team: 0, max_people: 20, progress: true, end: false,
                ratio_1: 50, ratio_2: 30, ratio_3: 20, frame: 4
              });
              setIsModalOpen(true);
            }}
            className="w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Event List */}
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.event_id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-0.5 rounded-full text-[9px] font-black tracking-tighter ${event.event_type === 'WED' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                {event.event_type === 'WED' ? 'SU-BAL-I' : 'RANKING'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { 
                  setEditingEvent(event); 
                  setFormData({ ...event, event_date: formatForInput(event.event_date) }); 
                  setIsModalOpen(true); 
                }} className="p-2 text-slate-300 hover:text-slate-900"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(event.event_id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight italic leading-tight">{event.title}</h3>
            
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold mb-5 italic">
              <Calendar size={13} className="text-slate-300" /> 
              {event.event_date.replace('T', ' ').slice(0, 16)}
            </div>

            {/* 통계 섹션 (미신청자/확정자 표시 복구) */}
            <div className="bg-slate-50 rounded-[24px] p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-slate-900 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Confirmed</span>
                </div>
                <p className="text-sm font-black text-slate-900">{event.confirmedCount} <span className="text-[11px] text-slate-300">/ {event.max_people}명</span></p>
              </div>
              
              <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Waiting List</span>
                </div>
                <p className="text-sm font-black text-orange-500">{event.waitingCount}명 대기중</p>
              </div>
            </div>

            {/* 미입금자 경고 표시 복구 */}
            {event.pendingPaymentCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-2xl mb-4 border border-red-100">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter flex items-center gap-1.5">
                  <AlertCircle size={14} /> 입금 확인 필요
                </span>
                <span className="text-[11px] font-black text-red-600">{event.pendingPaymentCount}명 미입금</span>
              </div>
            )}

            <Link href={`/admin/events/${event.event_id}`} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[20px] font-black text-[11px] uppercase tracking-wider shadow-lg active:scale-95 transition-all">
              신청자 명단 관리 <ChevronRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      {/* --- [팝업: 원본 코드와 100% 동일하게 복구] --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-end z-[120]">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-[40px] flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
            <div className="px-10 pt-10 pb-6 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Event Settings</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 pb-10 no-scrollbar">
              <form id="eventForm" onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">이벤트 명칭</label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none outline-none font-bold text-lg focus:ring-2 focus:ring-slate-900/5 transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">유형</label>
                    <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm appearance-none outline-none">
                      <option value="WED">수발이 (WED)</option>
                      <option value="RANK">랭킹전 (RANK)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">최대 인원</label>
                    <input type="number" value={formData.max_people} onChange={(e) => setFormData({...formData, max_people: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">날짜 및 시간</label>
                  <input required type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm outline-none" />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">참가비 설정</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase">개인전 비용</span>
                      <input type="number" value={formData.event_pay_person} onChange={(e) => setFormData({...formData, event_pay_person: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm outline-none" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase">팀전 비용</span>
                      <input type="number" value={formData.event_pay_team} onChange={(e) => setFormData({...formData, event_pay_team: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">상금 및 게임 정보</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                        <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase">게임 수 (Frame)</span>
                        <input type="number" value={formData.frame} onChange={(e) => setFormData({...formData, frame: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm outline-none" />
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase text-center">1등 (%)</span>
                        <input type="number" value={formData.ratio_1} onChange={(e) => setFormData({...formData, ratio_1: e.target.value})} className="w-full px-4 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm text-center outline-none" />
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase text-center">2등 (%)</span>
                        <input type="number" value={formData.ratio_2} onChange={(e) => setFormData({...formData, ratio_2: e.target.value})} className="w-full px-4 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm text-center outline-none" />
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 ml-2 mb-1 block uppercase text-center">3등 (%)</span>
                        <input type="number" value={formData.ratio_3} onChange={(e) => setFormData({...formData, ratio_3: e.target.value})} className="w-full px-4 py-5 bg-slate-50 rounded-3xl border-none font-bold text-sm text-center outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">대시보드 노출</label>
                      <button type="button" onClick={() => setFormData({...formData, progress: !formData.progress})} className={`px-8 py-3 rounded-full font-black text-xs transition-all ${formData.progress ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {formData.progress ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">모집 상태</label>
                      <button type="button" onClick={() => setFormData({...formData, end: !formData.end})} className={`px-8 py-3 rounded-full font-black text-xs transition-all ${!formData.end ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                        {!formData.end ? '모집 중' : '마감'}
                      </button>
                    </div>
                </div>
              </form>
            </div>

            <div className="px-10 py-8 bg-white border-t border-slate-50 flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[11px] uppercase">Cancel</button>
              <button form="eventForm" type="submit" className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] shadow-xl active:scale-95 transition-all uppercase italic">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}