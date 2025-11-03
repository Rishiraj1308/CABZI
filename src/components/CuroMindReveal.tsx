
'use client'

import { motion } from 'framer-motion'
import { BrainCircuit } from 'lucide-react'

export default function CuroMindReveal() {
  const text = "The next turn is thinking...";
  const chars = Array.from(text);

  const container = {
    hidden: { opacity: 1 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "tween",
        duration: 0.5,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };
  
  const intelligentStartIndex = text.indexOf("thinking");
  const intelligentEndIndex = intelligentStartIndex + "thinking".length;

  return (
    <section className="relative flex flex-col items-center justify-center text-center overflow-hidden py-16">
      
      {/* === Glowing Background Core === */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent blur-3xl animate-pulse"></div>

      {/* === Neural Ripple Lines === */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-[120%] h-[120%] border border-primary/10 rounded-full"
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

      {/* === Floating Energy Orb with Icon === */}
      <motion.div
        className="relative w-24 h-24 flex items-center justify-center mb-8"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="absolute w-full h-full bg-primary/20 rounded-full blur-2xl" />
        <BrainCircuit className="relative w-16 h-16 text-primary/80" />
      </motion.div>

      {/* === Title with Typewriter effect === */}
      <motion.h2
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight z-10 leading-snug flex flex-wrap justify-center"
      >
        {chars.map((char, index) => (
          <motion.span
            key={index}
            variants={child}
            className={
              index >= intelligentStartIndex && index < intelligentEndIndex
                ? "text-primary"
                : (char === '.' && index > intelligentEndIndex) 
                ? "animate-pulse"
                : ""
            }
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.h2>


      {/* === Subtitle === */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="mt-4 text-muted-foreground text-lg md:text-xl z-10"
      >
        Coming soon: The mind that cares.
      </motion.p>

      {/* === Bottom Glow === */}
      <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-background via-background/50 to-transparent blur-2xl z-0"></div>
    </section>
  )
}
