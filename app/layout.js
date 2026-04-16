import "./globals.css";
import Sidebar from "./components/Sidebar";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#F8F9FA] text-[#1D1D1F] overflow-x-hidden">
        {/* 사이드바는 이제 독립된 레이어로 작동합니다 */}
        <Sidebar />
        
        {/* 본문은 사이드바 너비와 상관없이 항상 full width */}
        <main className="min-h-screen pb-12 transition-all duration-300">
          <div className="max-w-md mx-auto px-4 pt-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}