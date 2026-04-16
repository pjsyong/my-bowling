import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "Subal Bowl Management",
  description: "Bowling Club Management System",
  colorScheme: 'light only',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen bg-[#F8F9FA] text-[#1D1D1F] overflow-x-hidden">
        <Sidebar />
        {/* 모바일 최적화: 사이드바 마진 제거, 패딩 최소화 */}
        <main className="flex-1 transition-all duration-300 w-full max-w-[500px] mx-auto min-h-screen bg-white shadow-sm">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}