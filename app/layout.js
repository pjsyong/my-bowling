import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "Subal Bowl Management",
  description: "Bowling Club Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
        <Sidebar />
        <main className="ml-64 flex-1 p-16">
          {children}
        </main>
      </body>
    </html>
  );
}