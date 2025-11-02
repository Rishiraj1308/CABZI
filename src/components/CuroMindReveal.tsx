'use client'

import { motion } from 'framer-motion'

export default function CuroMindReveal() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center py-40 overflow-hidden bg-[#090d12] text-white">
      
      {/* === Glowing Background Core === */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent blur-3xl animate-pulse"></div>

      {/* === Neural Ripple Lines === */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-[120%] h-[120%] border border-cyan-400/10 rounded-full"
            style={{
              translateX: '-50%',
              translateY: '-50%',
            }}
            animate={{
              scale: [1, 1.8],
              opacity: [0.4, 0],
            }}
            transition={{
              duration: 5,
              delay: i * 1.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* === Floating Energy Orb === */}
      <motion.div
        className="absolute w-24 h-24 bg-cyan-400/20 rounded-full blur-3xl"
        animate={{
          y: [0, -30, 0],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* === Title === */}
      <motion.h2
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        className="text-4xl md:text-6xl font-bold tracking-tight z-10 leading-snug"
      >
        Something <span className="text-cyan-400">intelligent</span> is awakening...
      </motion.h2>

      {/* === Subtitle === */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 1 }}
        className="mt-4 text-gray-400 text-lg md:text-xl z-10"
      >
        Coming soon: <span className="text-cyan-300 cursor-help" title="It's learning from Curocity...">The mind that cares.</span>
      </motion.p>

      {/* === Bottom Glow === */}
      <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-cyan-500/20 to-transparent blur-2xl"></div>
    </section>
  )
}
