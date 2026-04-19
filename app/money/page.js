'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Banknote, Clock, 
  Trophy, Phone, User, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DepositStatusPage() {
  // 데이터 호출: 입금 대기 중인 모든 참가자 명단
  const { data: entries, isLoading } = useQuery({
    queryKey: ['deposit-status-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entry')
        .select(`
          *,
          user:user_id ( name ),
          event:event_id ( title )
        `)
        .eq('payment_status', false) // 입금 미완료
        .eq('result', true)         // 신청 확정자
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    // 실시간성 설정
    refetchInterval: 10000, // 10초마다 자동으로 백그라운드 갱신
    staleTime: 0,           // 항상 새로운 데이터를 가져올 준비 유지
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse font-black text-slate-300 tracking-widest text-xl">LOADING...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        
        {/* 1. 입금 및 안내 정보 섹션 */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200"
        >
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Banknote size={12} className="text-blue-400" /> Deposit Account
              </p>
              <h2 className="text-2xl font-black tracking-tight mb-1">카카오뱅크 3333-29-5909567</h2>
              <p className="text-lg font-bold text-blue-400">예금주: 이형렬</p>
            </div>

            <div className="pt-6 border-t border-slate-800 grid grid-cols-1 gap-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Phone size={12} className="text-blue-400" /> Inquiry
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                  <span className="text-sm font-bold text-slate-300">김민형 프로</span>
                  <a href="tel:010-0000-0000" className="text-sm font-black text-white hover:text-blue-400">010-0000-0000</a>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                  <span className="text-sm font-bold text-slate-300">이형렬 프로</span>
                  <a href="tel:010-0000-0000" className="text-sm font-black text-white hover:text-blue-400">010-0000-0000</a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. 실시간 대기 현황 요약 */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between px-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">입금 확인 대기중</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{entries?.length || 0}</span>
              <span className="text-xs font-bold text-slate-400">명</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"></div>
            <AlertCircle className="text-amber-400 relative z-10" size={28} />
          </div>
        </div>

        {/* 3. 전체 입금 현황 리스트 */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h3 className="font-black text-slate-900 text-sm">확인 대기 명단</h3>
            </div>
            {/* 실시간 갱신 배지 */}
            <div className="flex items-center gap-1.5">
               <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Live Updating</span>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {entries?.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User size={24} className="text-slate-200" />
                </div>
                <p className="text-slate-400 text-sm font-bold">확인할 내역이 없습니다.</p>
              </div>
            ) : (
              entries?.map((entry) => (
                <div key={entry.entry_id} className="p-5 flex justify-between items-center transition-colors hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner">
                      <User size={20} />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-black text-slate-800 leading-none">{entry.user?.name}</p>
                      </div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                        <Trophy size={10} /> {entry.event?.title || '이벤트 정보 없음'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-700 mb-1">
                      {(entry.payment_amount || 0).toLocaleString()}원
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-400">
                        입금 확인중
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-300 font-bold px-4 leading-relaxed">
          관리자가 실시간으로 입금 내역을 대조하고 있습니다.<br/>
          입금 완료 후 리스트에서 사라지면 처리가 완료된 것입니다.
        </p>
      </div>
    </div>
  );
}