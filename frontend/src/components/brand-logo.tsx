'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/car.svg" // 🧠 path from /public folder
        alt="Curocity Logo"
        width={40}
        height={40}
        priority
      />
      <span className="text-2xl font-bold text-primary tracking-tight">
        Curocity
      </span>
    </Link>
  );
}
