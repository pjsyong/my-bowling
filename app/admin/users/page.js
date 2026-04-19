'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { UserPlus, Pencil, Trash2, ArrowLeft, User, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function UserManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', current_id: '', type_pro: 0, official: false });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .order('user_id', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
  });

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'injeong@gmail.com') {
        alert('관리자 인증이 필요합니다.');
        router.push('/admin');
      }
    };
    checkAuth();
  }, [router]);

  const filteredUsers = users.filter(user => {
    if (filterStatus === '전체') return true;
    if (filterStatus === '일반') return user.official === true;
    if (filterStatus === '게스트') return user.official === false;
    if (filterStatus === '프로') return user.type_pro === 1;
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const trimmedId = formData.current_id.trim();
    const trimmedName = formData.name.trim();

    try {
      const { data: existingUsers } = await supabase.from('user').select('user_id, name').eq('current_id', trimmedId).limit(1);
      const existingUser = existingUsers?.[0];

      if (existingUser && (!editingUser || existingUser.user_id !== editingUser.user_id)) {
        alert(`이미 사용 중인 ID입니다.\n(등록된 사용자: ${existingUser.name})`);
        return;
      }

      if (editingUser) {
        await supabase.from('user').update({
          name: trimmedName, current_id: trimmedId,
          type_pro: parseInt(formData.type_pro), official: formData.official 
        }).eq('user_id', editingUser.user_id);
      } else {
        await supabase.from('user').insert([{
          name: trimmedName, current_id: trimmedId,
          type_pro: parseInt(formData.type_pro), official: formData.official, created_at: today
        }]);
      }

      setIsModalOpen(false);
      setEditingUser(null);
      refreshUsers();
    } catch (error) {
      alert('동작 실패: ' + error.message);
    }
  };

  // --- 추가된 함수 시작 ---
  const handleDeleteClick = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };
  // --- 추가된 함수 끝 ---

  const confirmDelete = async () => {
    if (deleteConfirmText !== deleteTarget.name) {
      alert('이름을 정확히 입력해주세요.');
      return;
    }

    try {
      await supabase.from('user').delete().eq('user_id', deleteTarget.user_id);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      refreshUsers();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Header (기존과 동일) */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 pt-4 pb-2">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></Link>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">User Master</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{filteredUsers.length} Results</p>
              </div>
            </div>
            <button 
              onClick={() => { setEditingUser(null); setFormData({ name: '', current_id: '', type_pro: 0, official: false }); setIsModalOpen(true); }}
              className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all"
            >
              <UserPlus size={20} />
            </button>
          </div>

          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            {['전체', '일반', '프로', '게스트'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-shrink-0 px-5 py-2 rounded-xl text-[11px] font-black transition-all ${
                  filterStatus === status 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Card List */}
      <div className="max-w-xl mx-auto p-4 space-y-3">
        {filteredUsers.map((user) => {
          const getIconColorClass = () => {
            if (user.type_pro === 1) return 'bg-blue-50 text-blue-600';
            if (!user.official) return 'bg-emerald-50 text-emerald-600';
            return 'bg-slate-50 text-slate-400';
          };

          return (
            <div key={user.user_id} className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 animate-in fade-in duration-300">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getIconColorClass()}`}>
                    <User size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-black text-slate-900 truncate">{user.name}</h3>
                      {user.type_pro === 1 && (
                        <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-md italic uppercase">Pro</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">ID: {user.current_id}</p>
                      {user.official ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                          <ShieldCheck size={12} /> 정회원
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                          <UserCheck size={12} /> 게스트
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button onClick={() => { 
                    setEditingUser(user); 
                    setFormData({ name: user.name, current_id: user.current_id, type_pro: user.type_pro, official: user.official }); 
                    setIsModalOpen(true); 
                  }} className="p-2 text-slate-300"><Pencil size={18} /></button>
                  <button onClick={() => handleDeleteClick(user)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="text-center py-20 text-slate-300 font-bold">해당하는 회원이 없습니다.</div>
        )}
      </div>

      {/* 모달 부분 생략 (동일함) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          {/* ... Modal UI ... */}
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 sm:hidden" />
            <h2 className="text-xl font-black text-slate-900 mb-6">{editingUser ? '정보 수정' : '신규 회원 등록'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identification ID</label>
                <input required value={formData.current_id} onChange={(e) => setFormData({...formData, current_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-200 outline-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setFormData({...formData, type_pro: 0})} className={`flex-1 py-2.5 rounded-lg font-black text-[11px] ${formData.type_pro === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>일반</button>
                    <button type="button" onClick={() => setFormData({...formData, type_pro: 1})} className={`flex-1 py-2.5 rounded-lg font-black text-[11px] ${formData.type_pro === 1 ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>프로</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setFormData({...formData, official: false})} className={`flex-1 py-2.5 rounded-lg font-black text-[11px] ${!formData.official ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>게스트</button>
                    <button type="button" onClick={() => setFormData({...formData, official: true})} className={`flex-1 py-2.5 rounded-lg font-black text-[11px] ${formData.official ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>정회원</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">취소</button>
                <button className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">저장하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 (기존과 동일) */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-6">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4"><Trash2 size={32} /></div>
              <h2 className="text-xl font-black text-slate-900 mb-2">회원 정보 삭제</h2>
              <p className="text-sm text-slate-500 font-bold mb-6">이 작업은 경기 기록을 포함한 모든 데이터를<br/>영구적으로 삭제하며 되돌릴 수 없습니다.</p>
              <div className="w-full bg-slate-50 rounded-2xl p-5 mb-6 text-left border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">삭제 대상 이름</p>
                    <p className="text-lg font-black text-rose-600">{deleteTarget.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">식별 ID</p>
                    <p className="text-sm font-bold text-slate-600">{deleteTarget.current_id}</p>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter text-left ml-1">확인을 위해 삭제 대상의 이름 [<span className="text-rose-500">{deleteTarget.name}</span>]을 입력하세요</p>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-slate-100 focus:border-rose-500 rounded-2xl outline-none text-center font-black text-slate-800 transition-all" placeholder={deleteTarget.name} />
              </div>
              <div className="flex gap-3 w-full mt-8">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">취소</button>
                <button onClick={confirmDelete} disabled={deleteConfirmText !== deleteTarget.name} className={`flex-[2] py-4 rounded-2xl font-black shadow-lg transition-all ${deleteConfirmText === deleteTarget.name ? 'bg-rose-500 text-white shadow-rose-200 active:scale-95' : 'bg-slate-200 text-white cursor-not-allowed'}`}>영구 삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}