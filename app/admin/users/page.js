'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, Pencil, Trash2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // formData에 official 추가
  const [formData, setFormData] = useState({ name: '', phone: '', type_pro: 0, official: false });
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .order('user_id', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('불러오기 실패:', error.message);
    }
  };

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus !== 'true') {
      alert('관리자 인증이 필요합니다.');
      router.push('/admin');
    }
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('user')
          .update({
            name: formData.name,
            phone: formData.phone,
            type_pro: parseInt(formData.type_pro),
            official: formData.official // official 상태 업데이트 추가
          })
          .eq('user_id', editingUser.user_id);
        
        if (error) throw error;
        alert('수정 성공!');
      } else {
        const { error } = await supabase
          .from('user')
          .insert([{
            name: formData.name,
            phone: formData.phone,
            type_pro: parseInt(formData.type_pro),
            official: formData.official, // 등록 시에도 official 상태 반영
            created_at: today
          }]);
        
        if (error) throw error;
        alert('등록 성공!');
      }
      
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      alert('동작 실패: ' + error.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('user').delete().eq('user_id', userId);
      if (error) throw error;
      alert('삭제 성공!');
      fetchUsers();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans">
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex items-center">
          <Link 
            href="/admin" 
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            관리자 설정으로 돌아가기
          </Link>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">회원 리스트</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">클럽 멤버들의 정보를 수정하거나 승인 상태를 관리합니다.</p>
          </div>
          
          <button 
            onClick={() => { setEditingUser(null); setFormData({ name: '', phone: '', type_pro: 0, official: false }); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-[20px] flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-bold"
          >
            <UserPlus size={20} /> 신규 회원
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-50 text-[11px] uppercase tracking-widest text-slate-400 font-black">
              <th className="px-8 py-6 text-center w-20">ID</th>
              <th className="px-8 py-6">이름</th>
              <th className="px-8 py-6 text-center">구분</th>
              <th className="px-8 py-6 text-center">상태</th>
              <th className="px-8 py-6">연락처</th>
              <th className="px-8 py-6 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 text-center text-slate-300 font-black">{user.user_id}</td>
                <td className="px-8 py-6 font-bold text-slate-800">{user.name}</td>
                <td className="px-8 py-6 text-center">
                  {user.type_pro === 1 ? (
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black italic">PRO</span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">NORMAL</span>
                  )}
                </td>
                {/* 정회원/비회원 상태 표시 추가 */}
                <td className="px-8 py-6 text-center">
                  {user.official ? (
                    <div className="flex items-center justify-center gap-1 text-emerald-500 font-black text-[10px]">
                      <CheckCircle2 size={12} /> 정회원
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-slate-300 font-bold text-[10px]">
                      <XCircle size={12} /> 비회원
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-slate-500 font-bold text-sm">{user.phone}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { 
                      setEditingUser(user); 
                      setFormData({ name: user.name, phone: user.phone, type_pro: user.type_pro, official: user.official }); 
                      setIsModalOpen(true); 
                    }} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(user.user_id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-900 mb-8">{editingUser ? '정보 수정' : '회원 등록'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold text-lg" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full mt-2 px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" placeholder="010-0000-0000" />
              </div>
              
              {/* 구분과 상태를 나란히 배치 */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">구분</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button type="button" onClick={() => setFormData({...formData, type_pro: 0})} className={`py-3 rounded-xl font-black text-[11px] transition-all ${formData.type_pro === 0 ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>일반</button>
                    <button type="button" onClick={() => setFormData({...formData, type_pro: 1})} className={`py-3 rounded-xl font-black text-[11px] transition-all ${formData.type_pro === 1 ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>프로</button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">승인 상태</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button type="button" onClick={() => setFormData({...formData, official: false})} className={`py-3 rounded-xl font-black text-[11px] transition-all ${!formData.official ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'}`}>미승인</button>
                    <button type="button" onClick={() => setFormData({...formData, official: true})} className={`py-3 rounded-xl font-black text-[11px] transition-all ${formData.official ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>정회원</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black">취소</button>
                <button className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}