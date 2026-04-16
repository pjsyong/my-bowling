import "./globals.css";
import Sidebar from "./components/Sidebar";
import QueryProvider from "./components/QueryProvider"; // 1. 임포트 추가

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
        {/* 2. 전체를 QueryProvider로 감싸줍니다 */}
        <QueryProvider>
          <Sidebar />
          <main className="flex-1 transition-all duration-300 w-full max-w-[500px] mx-auto min-h-screen bg-white shadow-sm">
            <div className="p-4 md:p-8">
              {children}
            </div>
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}