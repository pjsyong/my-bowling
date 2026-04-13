import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "Subal Bowl Management",
  description: "Bowling Club Management System",
  colorScheme: 'light only',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // 블랙이 아닌 기본값(화이트) 유지
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
        <Sidebar />
        
        {/* main 태그에서 ml-64를 제거하고 inline-style 또는 CSS 변수 연동 */}
        <main 
          className="flex-1 p-8 md:p-16 transition-all duration-300 overflow-x-hidden"
          style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
        >
          {/* 콘텐츠가 사이드바가 접혔을 때 너무 퍼지지 않게 가이드라인을 잡아줍니다. */}
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}