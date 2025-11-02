'use client'

import { motion } from 'framer-motion'

export default function CuroMindReveal() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center py-32 overflow-hidden bg-[#0b0f14] text-white">
      
      {/* Glowing background aura */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent blur-3xl animate-pulse"></div>
      
      {/* Floating light particle */}
      <motion.div
        className="absolute w-20 h-20 bg-cyan-400/20 rounded-full blur-3xl"
        animate={{
          y: [0, -20, 0],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Text reveal */}
      <motion.h2
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-3xl md:text-5xl font-bold tracking-tight z-10"
      >
        Something intelligent is <span className="text-cyan-400">awakening...</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="mt-4 text-gray-400 text-lg z-10"
      >
        Coming soon: <span className="text-cyan-300 cursor-help" title="It's learning from Curocity...">The mind that cares.</span>
      </motion.p>

      {/* Soft bottom glow */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-cyan-500/20 to-transparent blur-2xl"></div>
    </section>
  )
}