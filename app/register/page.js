'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Fingerprint, User, Award, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
// Supabase 클라이언트 임포트
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    current_id: '',
    role: '일반인', 
    official: false, // 추가: 소속 구분 기본값 (false = 게스트)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleIdChange = (e) => {
    setFormData({ ...formData, current_id: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.current_id.trim().length < 2) {
      alert('식별 ID를 정확히 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('user')
        .select('user_id')
        .eq('current_id', formData.current_id.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        alert('이미 등록 신청되었거나 가입된 정보입니다. 관리자에게 문의하세요.');
        setIsSubmitting(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { error: insertError } = await supabase
        .from('user')
        .insert([{
          name: formData.name.trim(),
          current_id: formData.current_id.trim(),
          type_pro: formData.role === '프로' ? 1 : 0,
          official: formData.official, // 선택된 official 값 반영
          created_at: today 
        }]);

      if (insertError) throw insertError;

      setIsSubmitted(true);
    } catch (error) {
      alert('신청 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 flex flex-col items-center text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">등록 신청 완료!</h1>
        <p className="text-slate-500 font-medium leading-relaxed">
          {formData.name}님의 회원 등록이 완료되었습니다.<br />
          게임 신청 페이지를 통해 게임 신청이 가능합니다.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-6">
      <header className="mb-8 md:mb-12 text-center md:text-left flex flex-col items-center md:items-start">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-100">
          <UserPlus size={28} className="md:w-8 md:h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">신규 회원 등록</h1>
        <p className="text-sm md:text-base text-slate-400 font-medium mt-2 md:mt-3 leading-relaxed">
          정보를 입력해 주시면 운영진 확인 후 <br className="md:hidden" /> 정식 멤버로 등록됩니다.
        </p>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[30px] md:rounded-[40px] border border-gray-100 shadow-sm p-6 md:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* 성함 입력 */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <User size={13} /> 성함
            </label>
            <input 
              required
              type="text"
              placeholder="실명을 입력해 주세요"
              className="w-full px-6 md:px-8 py-4.5 md:py-5 bg-slate-50 border-none rounded-[20px] md:rounded-[24px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-sm md:text-base"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={isSubmitting}
            />
          </div>

          {/* 식별 ID 입력 */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <Fingerprint size={13} /> 식별 ID
            </label>
            <input 
              required
              type="text"
              placeholder="커스텀 ID를 입력해 주세요"
              className="w-full px-6 md:px-8 py-4.5 md:py-5 bg-slate-50 border-none rounded-[20px] md:rounded-[24px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-sm md:text-base"
              value={formData.current_id}
              onChange={handleIdChange}
              disabled={isSubmitting}
            />
          </div>

          {/* 회원 구분 (일반인/프로) */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <Award size={13} /> 회원 구분
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['일반인', '프로'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  disabled={isSubmitting}
                  className={`py-4 rounded-[20px] font-bold text-sm transition-all border-2 ${
                    formData.role === role 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'bg-white border-gray-100 text-slate-400 hover:border-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* 추가된 항목: 소속 구분 (게스트/정회원) */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <ShieldCheck size={13} /> 소속 구분
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '게스트', value: false },
                { label: '정회원', value: true }
              ].map((type) => (
                <button
                  key={type.label}
                  type="button"
                  onClick={() => setFormData({ ...formData, official: type.value })}
                  disabled={isSubmitting}
                  className={`py-4 rounded-[20px] font-bold text-sm transition-all border-2 ${
                    formData.official === type.value 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-white border-gray-100 text-slate-400 hover:border-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-5.5 md:py-6 bg-slate-900 text-white rounded-[22px] md:rounded-[28px] font-black text-base md:text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 md:gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}
          >
            <Send size={18} />
            {isSubmitting ? '신청 처리 중...' : '등록 신청하기'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}