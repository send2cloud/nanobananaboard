import React, { useRef, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// --- 2D Animated Background ---

const FlowNetworkBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                setDimensions({ width: window.innerWidth, height: window.innerHeight });
            }
        };
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width;
        let height = canvas.height;

        // Particle configuration
        const particleCount = Math.min(100, (width * height) / 10000);
        const particles: { x: number; y: number; vx: number; vy: number }[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
            });
        }

        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            ctx.fillStyle = '#facc15'; // Yellow-400
            ctx.strokeStyle = '#3b82f6'; // Blue-500

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                // Bounce
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - dist / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 bg-zinc-950"
        />
    );
};

// --- UI Components ---

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="relative w-full h-screen overflow-hidden text-white font-sans selection:bg-yellow-500/30">
            <FlowNetworkBackground />

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} // Smooth easing
                    className="text-center px-4"
                >
                    <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/80 backdrop-blur-md text-zinc-400 text-xs font-mono uppercase tracking-widest shadow-xl">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Next Gen Visual Storyboarding
                    </div>

                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-sm">
                        NANO BANANA
                    </h1>

                    <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        Craft cinematic stories with our <span className="text-yellow-400 font-medium">Node-based Generative AI</span>.
                        Connect ideas, generate visuals, and iterate instantly.
                    </p>

                    <div className="pointer-events-auto flex flex-col items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(250, 204, 21, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            onClick={() => navigate('/app')}
                            className="group relative px-10 py-5 bg-yellow-400 text-black font-bold text-xl rounded-full overflow-hidden transition-all hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                START CREATING
                                <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </span>
                        </motion.button>
                        <p className="text-xs text-zinc-600 flex items-center gap-2">
                            <span>Open Source</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                            <span>Free to try</span>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Footer / Info */}
            <div className="absolute bottom-8 left-8 z-10 hidden md:block">
                <p className="text-xs text-zinc-600 mb-1">Powered by</p>
                <div className="flex items-center gap-4 text-zinc-500 text-sm font-medium">
                    <span>Google Gemini</span>
                    <span className="w-px h-3 bg-zinc-800"></span>
                    <span>OpenRouter</span>
                </div>
            </div>
        </div>
    );
}
