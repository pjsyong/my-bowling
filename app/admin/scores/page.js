'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Calendar, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScoreManagementHub() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('event')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (eventError) throw eventError;
      setEvents(eventData || []);
    } catch (error) {
      console.error('Data Load Error:', error);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="p-10 text-center font-black text-slate-400 tracking-widest">LOADING...</div>;

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-10">
        <Link href="/admin" className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-sm bg-white w-fit px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Admin
        </Link>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Score Control</h1>
          <p className="text-slate-400 font-medium mt-1">점수를 입력하거나 수정할 대회를 선택하세요.</p>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <Link href={`/admin/scores/${event.event_id}`} key={event.event_id}>
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden h-full flex flex-col justify-between">
              <div>
                <div className="mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                    event.event_type === 'WED' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {event.event_type === 'WED' ? 'SU-BAL-I' : 'RANKING'}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">
                  {event.title}
                </h3>
                
                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                  <Calendar size={16} /> {new Date(event.event_date).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-300 group-hover:text-slate-900 transition-colors">
                점수 관리하기 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}