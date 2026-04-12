'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Plus, Pencil, Trash2, ArrowLeft, 
  CheckCircle2, Clock, Users, Coins, Calendar 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventManagementPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // 알려주신 컬럼 구조에 맞춘 초기값
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'WED',
    event_date: new Date().toISOString().split('T')[0],
    fee: 10000,
    max_people: 20,
    progress: true,
    end: false
  });

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus !== 'true') {
      router.push('/admin');
      return;
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
  const { data, error } = await supabase
    .from('event') // 테이블 이름이 정확히 event인지 확인 (이미지상으론 맞습니다!)
    .select('*')
    .order('event_date', { ascending: false });
  
  if (error) {
    console.error('상세에러:', error);
  } else {
    setEvents(data || []);
  }
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // 폼 전송 전 데이터 정제
  const submitData = {
    title: formData.title,
    event_type: formData.event_type,
    event_date: formData.event_date,
    fee: parseInt(formData.fee),
    max_people: parseInt(formData.max_people),
    progress: formData.progress,
    end: formData.end
  };

  try {
    if (editingEvent) {
      // 수정 모드
      const targetId = editingEvent.event_id; // 편집 버튼에서 저장한 원본 ID
      
      const { error } = await supabase
        .from('event')
        .update(submitData)
        .eq('event_id', targetId); // PK인 event_id와 일치하는 행 수정

      if (error) throw error;
      alert('대회 정보가 수정되었습니다.');
    } else {
      // 등록 모드
      const { error } = await supabase.from('event').insert([submitData]);
      if (error) throw error;
      alert('새 대회가 등록되었습니다.');
    }
    
    setIsModalOpen(false);
    fetchEvents();
  } catch (error) {
    console.error("처리 중 오류:", error);
    alert('오류 발생: ' + (error.message || '알 수 없는 오류'));
  }
};

  const handleDelete = async (id) => {
    if (confirm('정말로 이 대회를 삭제하시겠습니까?')) {
      await supabase.from('event').delete().eq('event_id', id);
      fetchEvents();
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans">
      {/* 헤더 네비게이션 */}
      <div className="flex flex-col gap-6 mb-10">
        <Link href="/admin" className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-sm bg-white w-fit px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          관리자 설정으로 돌아가기
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Event Management</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">수발이(WED) 및 정기 대회(RANK) 일정을 관리합니다.</p>
          </div>
          <button 
            onClick={() => {
              setEditingEvent(null);
              setFormData({ title: '', event_type: 'WED', event_date: new Date().toISOString().split('T')[0], fee: 10000, max_people: 20, progress: true, end: false });
              setIsModalOpen(true);
            }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl font-bold"
          >
            <Plus size={20} /> 대회 생성
          </button>
        </div>
      </div>

      {/* 이벤트 리스트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <div key={event.event_id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            {/* 상단 태그 및 액션 */}
            <div className="flex justify-between items-start mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${event.event_type === 'WED' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                {event.event_type === 'WED' ? 'SU-BAL-I' : 'RANKING'}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { 
                    setEditingEvent(event); 
                    setFormData({
                      ...event,
                      // T를 기준으로 앞부분(날짜)만 추출
                      event_date: event.event_date ? event.event_date.split('T')[0] : '' 
                    }); 
                    setIsModalOpen(true); 
                  }} 
                  className="p-2 text-slate-400 hover:text-slate-900"
                >
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleDelete(event.event_id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">{event.title}</h3>
            
            {/* 상세 정보 섹션 */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                <Calendar size={16} /> {new Date(event.event_date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-slate-600 text-sm font-black">
                  <Coins size={16} className="text-slate-300" /> {event.fee?.toLocaleString()}원
                </div>
                <div className="flex items-center gap-1 text-slate-600 text-sm font-black">
                  <Users size={16} className="text-slate-300" /> 최대 {event.max_people}명
                </div>
              </div>
            </div>

            {/* 상태 뱃지 영역 */}
            <div className="pt-6 border-t border-slate-50 flex gap-3">
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${event.progress ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {event.progress ? '대시보드 노출 중' : '노출 안됨'}
              </span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${!event.end ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                {!event.end ? '모집 중' : '모집 종료'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 등록/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl my-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-10 tracking-tight">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이벤트 명칭</label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold text-lg" placeholder="예: 4월 수발 정기전" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">유형</label>
                  <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold appearance-none">
                    <option value="WED">수발이 (WED)</option>
                    <option value="RANK">랭킹전 (RANK)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">날짜</label>
                  <input required type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">참가비 (원)</label>
                  <input type="number" value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">최대 인원</label>
                  <input type="number" value={formData.max_people} onChange={(e) => setFormData({...formData, max_people: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" />
                </div>
              </div>

              {/* 토글 섹션 */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">점수 게시 여부</label>
                  <button type="button" onClick={() => setFormData({...formData, progress: !formData.progress})} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${formData.progress ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                    {formData.progress ? '대시보드 노출' : '노출 안함'}
                  </button>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">모집 상태</label>
                  <button type="button" onClick={() => setFormData({...formData, end: !formData.end})} className={`w-full py-4 rounded-2xl font-black text-xs transition-all ${!formData.end ? 'bg-blue-600 text-white shadow-lg' : 'bg-red-500 text-white'}`}>
                    {!formData.end ? '모집 중' : '모집 마감'}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black">Cancel</button>
                <button className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-slate-800 transition-all italic">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}