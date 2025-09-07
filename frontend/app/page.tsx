"use client";

import { Shield, Check, ShieldCheck, Code, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import BinaryRain from "@/components/BinaryRain";
import { useState } from "react";

// Parent container variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

// Child item variants
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } },
};

// Card variants
const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } },
  hover: {
    scale: 1.05,
    boxShadow: "0px 10px 30px rgba(0,0,0,0.3)",
    transition: { type: "spring", stiffness: 300 },
  },
};

// A button that fills slowly, then glows and pops.
const SimpleFillButton = ({ children }: { children: React.ReactNode }) => {
  // We define the fill duration here to easily sync the animations
  const fillDuration = 0.7;

  const buttonVariants = {
    rest: {
      scale: 1,
      boxShadow: "0px 0px 0px rgba(52, 211, 153, 0)", // green-400 at 0 opacity
    },
    hover: {
      scale: 1.05, // The "pop"
      boxShadow: "0px 0px 25px rgba(52, 211, 153, 0.7)", // The "glow"
      transition: {
        // This transition applies to the pop and glow
        // It starts *after* the fill animation is complete
        delay: fillDuration,
        type: "spring",
        stiffness: 300,
        damping: 15,
      },
    },
  };

  const liquidVariants = {
    rest: { y: "100%" },
    hover: {
      y: "0%",
      transition: {
        // This transition is for the liquid fill
        duration: fillDuration,
        ease: "easeInOut",
      },
    },
  };

  const textVariants = {
    rest: { color: "#60a5fa" }, // text-blue-400
    hover: {
      color: "#ffffff", // text-white
      transition: {
        duration: 0.3,
        delay: 0.1, // A slight delay so it feels tied to the fill
      },
    },
  };

  return (
    <motion.div
      className="relative inline-block overflow-hidden rounded-lg cursor-pointer border-2 border-blue-500"
      variants={buttonVariants}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      initial="rest"
    >
      {/* The filling liquid effect */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-0 h-full bg-gradient-to-t from-green-600 to-green-500"
        variants={liquidVariants}
      />
      
      {/* The text content */}
      <motion.span
        className="relative z-10 block py-3 px-6 text-center font-bold"
        variants={textVariants}
      >
        {children}
      </motion.span>
    </motion.div>
  );
};


// New Component for the specific Shield + Check animation
const AnimatedShield = ({ isHovered }: { isHovered: boolean }) => {
  const rgb = "34, 197, 94"; // Green

  return (
    <motion.div
      className="relative h-8 w-8" // Container for positioning
      animate={{
        scale: isHovered ? 1.2 : 1,
        rotate: isHovered ? [0, -10, 10, -10, 0] : 0,
      }}
      transition={{
        scale: { type: "spring", stiffness: 300, damping: 15 },
        rotate: { duration: 0.5, ease: "easeInOut" }
      }}
    >
      {/* Background Glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        animate={{
          backgroundColor: isHovered ? `rgba(${rgb}, 0.4)` : `rgba(${rgb}, 0)`,
          scale: isHovered ? 2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Drop Shadow Container */}
      <motion.div
        className="relative h-full w-full"
        animate={{
          filter: isHovered ? `drop-shadow(0 0 15px rgba(${rgb}, 0.6))` : `drop-shadow(0 0 0px rgba(${rgb}, 0))`,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* The Shield Icon (Base layer) */}
        <Shield
          className={`absolute top-0 left-0 h-8 w-8 transition-all duration-300 ease-in-out ${
            isHovered
              ? 'fill-green-500 stroke-green-600' // Filled green
              : 'fill-transparent stroke-green-400' // Outline only
          }`}
          strokeWidth={2}
        />
        {/* The Check Icon (Top layer) */}
        <Check
          className={`absolute top-0 left-0 h-8 w-8 transition-all duration-300 ease-in-out ${
            isHovered
              ? 'stroke-white' // Turns white
              : 'stroke-green-400' // Matches the outline color
          }`}
          strokeWidth={isHovered ? 3 : 2} // Gets bolder on hover
        />
      </motion.div>
      
      {/* Pulsing Ring effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-green-400" />
        </motion.div>
      )}
    </motion.div>
  );
};


// Updated Animated Icon Component (for the Code icon)
const AnimatedIcon = ({ Icon, color, isHovered }: { Icon: any, color: string, isHovered: boolean }) => {
  const colorMap: { [key: string]: string } = {
    "yellow": "250, 204, 21"
  };
  
  const rgb = colorMap[color] || "250, 204, 21";
  
  return (
    <motion.div
      className="relative"
      animate={{
        scale: isHovered ? 1.2 : 1,
        rotate: isHovered ? [0, -10, 10, -10, 0] : 0,
      }}
      transition={{
        scale: { type: "spring", stiffness: 300, damping: 15 },
        rotate: { duration: 0.5, ease: "easeInOut" }
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        animate={{
          backgroundColor: isHovered ? `rgba(${rgb}, 0.4)` : `rgba(${rgb}, 0)`,
          scale: isHovered ? 2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div
        animate={{
          filter: isHovered ? "drop-shadow(0 0 20px rgba(" + rgb + ", 0.8))" : "drop-shadow(0 0 0px rgba(" + rgb + ", 0))",
        }}
        transition={{ duration: 0.3 }}
      >
        <Icon 
          className={`h-8 w-8 relative z-10 transition-colors duration-300 ${
            isHovered ? "text-yellow-500" : "text-yellow-400"
          }`}
          // Animate strokeWidth for a "more solid" feel
          strokeWidth={isHovered ? 2.5 : 2}
        />
      </motion.div>
      
      {isHovered && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
        >
          <div className={`w-8 h-8 rounded-full border-2 ${
            color === "green" ? "border-green-400" : "border-yellow-400"
          }`} />
        </motion.div>
      )}
    </motion.div>
  );
};


export default function HomePage() {
  const brandName = "Logicortex";
  const titleWords = ["Finds", "&", "Fixes", "Flaws", "Automatically"];
  const { isAuthenticated } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(at 25% 25%, hsla(215,98%,60%,0.4) 0px, transparent 50%),
            radial-gradient(at 75% 35%, hsla(265,98%,60%,0.35) 0px, transparent 50%),
            radial-gradient(at 50% 85%, hsla(315,98%,60%,0.35) 0px, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120,119,198,0.5), rgba(255,255,255,0))
          `,
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 100%", "100% 0%", "0% 0%"],
          scale: [1, 1.12, 1, 1.12, 1],
          opacity: [0.8, 1, 0.8, 1, 0.8],
        }}
        transition={{ duration: 30, ease: "easeInOut", repeat: Infinity }}
      />

      <BinaryRain />

      {/* Main content */}
      <motion.div
        className="relative z-20 min-h-screen flex flex-col items-center justify-center p-4 text-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center space-y-4 max-w-4xl">
          <motion.div
            className="inline-flex items-center justify-center bg-blue-600/10 text-blue-400 rounded-full p-2 mb-4"
            variants={itemVariants}
          >
            <BrainCircuit className="h-8 w-8" />
          </motion.div>

          <motion.h1
            className="font-brand text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 pb-4"
            variants={containerVariants}
          >
            {brandName.split("").map((letter, index) => (
              <motion.span key={index} variants={itemVariants} className="inline-block">
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p className="font-brand text-2xl md:text-3xl font-bold" variants={containerVariants}>
            <span className="text-gray-300">The Security AI that </span>
            <span className="text-green-400">
              {titleWords.map((word, index) => (
                <motion.span key={index} variants={itemVariants} className="inline-block mr-2 md:mr-3">
                  {word}
                </motion.span>
              ))}
            </span>
          </motion.p>

          <motion.p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto pt-2" variants={itemVariants}>
            Goes beyond static scans to autonomously detect, test, and patch complex business logic flaws.
          </motion.p>

          {/* Auth-aware Buttons */}
          <motion.div className="pt-8 flex justify-center gap-4" variants={itemVariants}>
            {isAuthenticated ? (
              <Link href="/dashboard" passHref>
                <SimpleFillButton>Go to Your Dashboard</SimpleFillButton>
              </Link>
            ) : (
              <>
                <Link href="/login" passHref>
                  <SimpleFillButton>Login</SimpleFillButton>
                </Link>
                <Link href="/signup" passHref>
                  <SimpleFillButton>Sign Up</SimpleFillButton>
                </Link>
              </>
            )}
          </motion.div>

          <div className="flex flex-col md:flex-row justify-center gap-6 pt-16">
            <motion.div
              className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50 w-full md:w-80 text-left backdrop-blur-sm cursor-pointer animate-pulseShift"
              variants={cardVariants}
              whileHover="hover"
              onHoverStart={() => setHoveredCard("flaws")}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <div className="mb-3">
                <AnimatedShield isHovered={hoveredCard === "flaws"} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Find Flaws</h2>
              <p className="text-gray-400">Identify complex business logic vulnerabilities that other scanners miss.</p>
            </motion.div>

            <motion.div
              className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50 w-full md:w-80 text-left backdrop-blur-sm cursor-pointer animate-pulseShift"
              variants={cardVariants}
              whileHover="hover"
              onHoverStart={() => setHoveredCard("code")}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <div className="mb-3">
                <AnimatedIcon 
                  Icon={Code} 
                  color="yellow" 
                  isHovered={hoveredCard === "code"} 
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">Fix Code</h2>
              <p className="text-gray-400">Automatically generate, test, and submit patches for review.</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}