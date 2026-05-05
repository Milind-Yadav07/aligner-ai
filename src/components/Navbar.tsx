"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return `relative py-1 transition-all duration-300 ${
      isActive 
        ? "text-blue-400 after:w-full" 
        : "text-slate-300 hover:text-blue-400 after:w-0 hover:after:w-full"
    } after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-white after:transition-all after:duration-300`;
  };

  return (
    <header className="border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="AlignerAI Logo" 
            width={32} 
            height={32} 
            className="object-contain"
          />
          <span className="font-bold text-xl tracking-tight text-white">
            Aligner<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-sm font-medium">
          <Link href="/" className={getLinkClasses("/")}>Analyze</Link>
          <Link href="/history" className={getLinkClasses("/history")}>History</Link>
        </nav>
      </div>
    </header>
  );
}
