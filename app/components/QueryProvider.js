'use client'; // 클라이언트 컴포넌트임을 선언

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  // 컴포넌트가 재렌더링되어도 클라이언트 객체가 유지되도록 useState로 감싸줍니다.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 1분(60,000ms) 동안은 데이터를 '신선'하다고 판단하여 
        // 페이지 이동 시 DB를 다시 호출하지 않고 캐시를 즉시 보여줍니다.
        staleTime: 60 * 1000, 
        // 창을 다시 포커스했을 때 자동으로 업데이트할지 여부
        refetchOnWindowFocus: true, 
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}