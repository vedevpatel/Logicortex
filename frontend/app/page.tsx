"use client";

import { ShieldCheck, Code, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Parent container variants for staggering children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

// Child item variants for fade-in effect
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

// Variants for interactive cards
const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } },
  hover: {
    scale: 1.05,
    boxShadow: "0px 10px 30px rgba(0,0,0,0.3)",
    transition: { type: "spring", stiffness: 300 },
  },
};

export default function HomePage() {
  const brandName = "Logicortex";
  // UPDATED tagline words
  const titleWords = ["Finds", "&", "Fixes", "Flaws", "Automatically"];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {/* Animated background from your implementation */}
      <motion.div
        className="absolute inset-0 z-0 bg-animate-optimized"
        style={{
          backgroundImage: `
            radial-gradient(at 27% 29%, hsla(215,98%,60%,0.25) 0px, transparent 50%),
            radial-gradient(at 73% 44%, hsla(265,98%,60%,0.2) 0px, transparent 50%),
            radial-gradient(at 49% 94%, hsla(315,98%,60%,0.2) 0px, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120,119,198,0.3), rgba(255,255,255,0))
          `,
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          scale: [1, 1.05, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{ duration: 25, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 text-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center space-y-4 max-w-4xl">
          {/* Icon above title */}
          <motion.div
            className="inline-flex items-center justify-center bg-blue-600/10 text-blue-400 rounded-full p-2 mb-4"
            variants={itemVariants}
          >
            <BrainCircuit className="h-8 w-8" />
          </motion.div>

          {/* Animated Brand Name */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 pb-4"
            variants={containerVariants}
          >
            {brandName.split("").map((letter, index) => (
              <motion.span key={index} variants={itemVariants} className="inline-block">
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* Animated Tagline */}
          <motion.p
            className="text-2xl md:text-3xl font-bold"
            variants={containerVariants}
          >
            <span className="text-gray-300">The Security AI that </span>
            <span className="text-green-400">
                {titleWords.map((word, index) => (
                <motion.span key={index} variants={itemVariants} className="inline-block mr-2 md:mr-3">
                    {word}
                </motion.span>
                ))}
            </span>
          </motion.p>


          {/* Sub-headline */}
          <motion.p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto pt-2" variants={itemVariants}>
            Goes beyond static scans to autonomously detect, test, and patch complex business logic flaws.
          </motion.p>

          {/* Buttons */}
          <motion.div className="pt-8 flex justify-center gap-4" variants={itemVariants}>
            <a href="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-300">
                  Login
                </Button>
              </motion.div>
            </a>
            <a href="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10 font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Sign Up
                </Button>
              </motion.div>
            </a>
          </motion.div>

          {/* Cards */}
          <div className="flex flex-col md:flex-row justify-center gap-6 pt-16">
            <motion.div
              className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50 w-full md:w-80 text-left backdrop-blur-sm cursor-pointer animate-pulseShift"
              variants={cardVariants}
              whileHover="hover"
            >
              <ShieldCheck className="h-8 w-8 text-green-400 mb-3" />
              <h2 className="text-xl font-semibold mb-2">Find Flaws</h2>
              <p className="text-gray-400">
                Identify complex business logic vulnerabilities that other scanners miss.
              </p>
            </motion.div>

            <motion.div
              className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50 w-full md:w-80 text-left backdrop-blur-sm cursor-pointer animate-pulseShift"
              variants={cardVariants}
              whileHover="hover"
            >
              <Code className="h-8 w-8 text-yellow-400 mb-3" />
              <h2 className="text-xl font-semibold mb-2">Fix Code</h2>
              <p className="text-gray-400">
                Automatically generate, test, and submit patches for review.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
