import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NookLabs ERD - 실시간 협업 데이터베이스 모델링 도구',
  description: 'NookLabs 실시간 멀티플레이어 ERD 모델링, 키보드 중심 컬럼 편집, MS SQL DDL 생성 도구',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased font-sans bg-slate-950 text-slate-100" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
