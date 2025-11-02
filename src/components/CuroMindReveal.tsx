
'use client'

import { motion } from 'framer-motion'
import { BrainCircuit } from 'lucide-react'

export default function CuroMindReveal() {
  const title = "Something intelligent is awakening...".split("");

  const container = {
    hidden: { opacity: 0 },
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
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };
  
  const text = "Something intelligent is awakening...";
  const words = text.split(" ");

  return (
    <section className="relative flex flex-col items-center justify-center text-center py-40 overflow-hidden">
      
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
        className="absolute w-24 h-24 bg-primary/20 rounded-full blur-3xl flex items-center justify-center"
        animate={{
          y: [0, -30, 0],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <BrainCircuit className="w-12 h-12 text-primary/50" />
      </motion.div>

      {/* === Title === */}
      <motion.h2
        initial="hidden"
        whileInView="visible"
        variants={container}
        className="text-4xl md:text-6xl font-bold tracking-tight z-10 leading-snug flex flex-wrap justify-center"
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            className="mr-[0.25em]"
          >
            {word === "intelligent" ? (
              <span className="text-primary">
                {word.split("").map((char, i) => (
                  <motion.span key={i} variants={child}>{char}</motion.span>
                ))}
              </span>
            ) : word.includes("...") ? (
               <span>
                {word.replace("...", "").split("").map((char, i) => (
                    <motion.span key={i} variants={child}>{char}</motion.span>
                ))}
                <motion.span variants={child} animate={{opacity: [0.5, 1, 0.5]}} transition={{repeat: Infinity, duration: 1.2}}>...</motion.span>
              </span>
            ) : (
              word.split("").map((char, i) => (
                <motion.span key={i} variants={child}>{char}</motion.span>
              ))
            )}
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
        Coming soon: <span className="text-primary/90 cursor-help" title="It's learning from Curocity...">The mind that cares.</span>
      </motion.p>

      {/* === Bottom Glow === */}
      <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-primary/20 to-transparent blur-2xl"></div>
    </section>
  )
}
