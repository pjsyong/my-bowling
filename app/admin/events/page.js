'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Pencil, Trash2, ArrowLeft, 
  CheckCircle2, Users, Calendar,
  UserCheck, Users2, AlertCircle, Clock, Banknote, X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventManagementPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  };

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'WED',
    event_date: new Date().toISOString().split('T')[0],
    event_pay_person: 0,
    event_pay_team: 0,
    max_people: 20,
    progress: true,
    end: false
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
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus !== 'true') {
      router.push('/admin');
      return;
    }
    fetchEvents();
  }, [router, fetchEvents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        title: formData.title,
        event_type: formData.event_type,
        event_date: formData.event_date,
        event_pay_person: parseInt(formData.event_pay_person || 0),
        event_pay_team: parseInt(formData.event_pay_team || 0),
        max_people: parseInt(formData.max_people),
        progress: formData.progress,
        end: formData.end
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('event')
          .update(submitData)
          .eq('event_id', Number(editingEvent.event_id));
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
      const { error } = await supabase.from('event').delete().eq('event_id', Number(id));
      if (error) throw error;
      showToast('삭제되었습니다.');
      fetchEvents();
    } catch (error) {
      showToast('삭제 실패', "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans">
      {/* Toast UI 생략 */}
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}>
            <CheckCircle2 size={20} />
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-6 mb-10">
        <Link href="/admin" className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-sm bg-white w-fit px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Admin
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Event Hub</h1>
          </div>
          <button 
            onClick={() => {
              setEditingEvent(null);
              setFormData({ title: '', event_type: 'WED', event_date: new Date().toISOString().split('T')[0], event_pay_person: 0, event_pay_team: 0, max_people: 20, progress: true, end: false });
              setIsModalOpen(true);
            }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl font-bold"
          >
            <Plus size={20} /> 대회 생성
          </button>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <div key={event.event_id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${event.event_type === 'WED' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                  {event.event_type === 'WED' ? 'SU-BAL-I' : 'RANKING'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { 
                    setEditingEvent(event); 
                    setFormData({ ...event, event_date: event.event_date?.split('T')[0] }); 
                    setIsModalOpen(true); 
                  }} className="p-2 text-slate-400 hover:text-slate-900"><Pencil size={18} /></button>
                  <button onClick={() => handleDelete(event.event_id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">{event.title}</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                  <Calendar size={16} /> {new Date(event.event_date).toLocaleDateString()}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-slate-600 text-[12px] font-black bg-indigo-50/50 px-3 py-1.5 rounded-xl">
                    <UserCheck size={14} className="text-indigo-500" /> 개인 {event.event_pay_person?.toLocaleString()}원
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-[12px] font-black bg-purple-50/50 px-3 py-1.5 rounded-xl">
                    <Users2 size={14} className="text-purple-500" /> 팀전 {event.event_pay_team?.toLocaleString()}원
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[24px] p-5 flex flex-col gap-4 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmed Status</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{event.confirmedCount}</span>
                        <span className="text-slate-300 font-bold">/</span>
                        <span className="text-sm font-bold text-slate-400">{event.max_people}명</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waiting List</span>
                      <div className="flex items-center justify-end gap-1 text-amber-500 font-black">
                        <Clock size={14} />
                        <span>{event.waitingCount}명</span>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${event.pendingPaymentCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <Banknote size={14} />
                      <span className="text-[11px] font-black uppercase tracking-tight">입금 미확인</span>
                    </div>
                    <span className="text-sm font-black">{event.pendingPaymentCount}명</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex gap-3">
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${event.progress ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {event.progress ? 'DASHBOARD ON' : 'HIDDEN'}
                </span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${!event.end ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                  {!event.end ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <Link href={`/admin/events/${event.event_id}`} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[20px] font-black text-xs hover:bg-blue-600 transition-all shadow-lg shadow-slate-200">
                <Users size={16} /> 신청자 명단 관리
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ 개선된 모달: 스크롤 및 높이 제한 적용 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* 고정 헤더 */}
            <div className="px-10 pt-10 pb-6 flex justify-between items-center bg-white">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Event Settings</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            {/* 스크롤 가능한 본문 구역 */}
            <div className="flex-1 overflow-y-auto px-10 pb-6 scrollbar-hide">
              <form id="eventForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이벤트 명칭</label>
                    <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 focus:ring-slate-100" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-[32px] border border-slate-100">
                    <div>
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">개인전 비용</label>
                      <input type="number" value={formData.event_pay_person} onChange={(e) => setFormData({...formData, event_pay_person: e.target.value})} className="w-full px-5 py-4 bg-white rounded-2xl border-none font-black text-base outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest block mb-2">팀전 비용</label>
                      <input type="number" value={formData.event_pay_team} onChange={(e) => setFormData({...formData, event_pay_team: e.target.value})} className="w-full px-5 py-4 bg-white rounded-2xl border-none font-black text-base outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">유형</label>
                      <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold appearance-none outline-none">
                        <option value="WED">수발이 (WED)</option>
                        <option value="RANK">랭킹전 (RANK)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">날짜</label>
                      <input required type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">최대 인원</label>
                    <input type="number" value={formData.max_people} onChange={(e) => setFormData({...formData, max_people: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">대시보드 노출</label>
                      <button type="button" onClick={() => setFormData({...formData, progress: !formData.progress})} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${formData.progress ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {formData.progress ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">모집 상태</label>
                      <button type="button" onClick={() => setFormData({...formData, end: !formData.end})} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${!formData.end ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                        {!formData.end ? '모집 중' : '마감'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* 고정 하단 버튼 */}
            <div className="px-10 py-8 bg-white border-t border-slate-50 flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black">Cancel</button>
              <button form="eventForm" type="submit" className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-slate-800 transition-all italic">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}