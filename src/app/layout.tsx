import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'VibeNest — Không Gian Tâm Sự Ẩn Danh',
  description: 'Nền tảng kết nối và chia sẻ tâm sự ẩn danh tối ưu cho di động.',
  openGraph: {
    title: 'VibeNest — Không Gian Tâm Sự Ẩn Danh',
    description: 'Nền tảng kết nối và chia sẻ tâm sự ẩn danh tối ưu cho di động.',
  },
  themeColor: '#0b0f19',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="vibenest-tailwind-config" strategy="beforeInteractive">{\
          `tailwind.config = { darkMode: 'class', theme: { extend: { fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], display: ['"Fraunces"', 'Georgia', 'serif'], mono: ['"JetBrains Mono"', 'monospace'] }, colors: { night: { 950: '#080b12', 900: '#0d121f', 800: '#161f33' }, ember: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' } } } } }`
        }</Script>
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-[#080b12] dark:text-slate-100 min-h-screen selection:bg-rose-500/20 selection:text-rose-400 transition-colors duration-200">{children}</body>
    </html>
  )
}
