'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Phone, User, MapPin, Send } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '', // 또는 소속/지역
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('회원 등록 신청이 완료되었습니다. 관리자 승인 후 대회 신청이 가능합니다!');
  };

  return (
    // 모바일에서는 p-4 또는 p-6, 데스크톱에서는 py-12 px-6으로 여백 조정
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-6">
      {/* 헤더 섹션: 모바일에서 마진 줄임 */}
      <header className="mb-8 md:mb-12 text-center md:text-left flex flex-col items-center md:items-start">
        {/* 아이콘 크기 및 마진 모바일 대응 */}
        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-100">
          <UserPlus size={28} className="md:w-8 md:h-8" />
        </div>
        {/* 글자 크기 모바일 대응 (text-3xl -> text-4xl) */}
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">신규 회원 등록</h1>
        <p className="text-sm md:text-base text-slate-400 font-medium mt-2 md:mt-3 leading-relaxed max-w-sm md:max-w-none">
          In-Jeong 볼링 클럽에 오신 것을 환영합니다! <br className="hidden md:block" />
          정보를 입력해 주시면 운영진 확인 후 정식 멤버로 등록됩니다.
        </p>
      </header>

      {/* 입력 폼 스테이지: 모바일에서 라운딩 및 패딩 줄임 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} // 모바일에서는 y축 이동 거리 줄임
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[30px] md:rounded-[40px] border border-gray-100 shadow-sm p-6 md:p-10"
      >
        {/* 간격 모바일 대응 (space-y-6 -> space-y-8) */}
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* 이름 입력 */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <User size={13} className="md:w-3.5 md:h-3.5" /> 성함
            </label>
            <input 
              required
              type="text"
              placeholder="실명을 입력해 주세요"
              // 터치 영역 확보를 위해 py-4.5 (약 18px), 데스크톱은 py-5 (20px)
              className="w-full px-6 md:px-8 py-4.5 md:py-5 bg-slate-50 border-none rounded-[20px] md:rounded-[24px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-sm md:text-base"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* 연락처 입력 */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <Phone size={13} className="md:w-3.5 md:h-3.5" /> 연락처
            </label>
            <input 
              required
              type="tel"
              inputMode="tel" // 모바일에서 숫자 키패드 유도
              placeholder="010-0000-0000"
              className="w-full px-6 md:px-8 py-4.5 md:py-5 bg-slate-50 border-none rounded-[20px] md:rounded-[24px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-sm md:text-base"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          {/* 추가 정보 (선택 사항) */}
          <div className="space-y-2.5 md:space-y-3">
            <label className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              <MapPin size={13} className="md:w-3.5 md:h-3.5" /> 거주 지역 또는 소속 (선택)
            </label>
            <input 
              type="text"
              placeholder="예: 용인시 처인구 / OO동호회"
              className="w-full px-6 md:px-8 py-4.5 md:py-5 bg-slate-50 border-none rounded-[20px] md:rounded-[24px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-sm md:text-base"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>

          {/* 안내 문구: 모바일에서 패딩 및 텍스트 크기 조정 */}
          <div className="p-5 md:p-6 bg-blue-50/50 rounded-[22px] md:rounded-[28px] border border-blue-50">
            <p className="text-xs md:text-sm text-blue-700 font-medium leading-relaxed">
              💡 <strong>안내:</strong> 중복 등록 방지를 위해 전화번호 무결성을 체크합니다. 
              이미 등록된 번호인 경우 관리자에게 문의해 주세요.
            </p>
          </div>

          {/* 제출 버튼: 터치에 용이하도록 py-5.5 (약 22px), 데스크톱은 py-6 (24px) */}
          <button 
            type="submit"
            className="w-full py-5.5 md:py-6 bg-slate-900 text-white rounded-[22px] md:rounded-[28px] font-black text-base md:text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2.5 md:gap-3"
          >
            <Send size={18} className="md:w-5 md:h-5" />
            등록 신청하기
          </button>
        </form>
      </motion.div>

      <footer className="mt-8 md:mt-10 text-center px-4">
        <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
          이미 등록된 회원인가요? <br className="md:hidden" />
          <span className="text-blue-600 underline underline-offset-4 cursor-pointer">대회 신청 바로가기</span>
        </p>
      </footer>
    </div>
  );
}