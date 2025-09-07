// frontend/components/BinaryRain.tsx
"use client";

import React, { useRef, useEffect } from 'react';

const BinaryRain = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        const vanishingPointX = width / 2;
        const vanishingPointY = height / 2;

        const characters = ['0', '1'];
        const streams: Stream[] = [];
        const streamCount = Math.floor(width / 50);

        class Stream {
            x!: number;
            y!: number;
            z!: number;
            speed!: number;
            length!: number;
            symbols!: { value: string }[];
            direction!: 'up' | 'down' | 'in' | 'out';
            fontSize!: number;
            alpha!: number;
            isDying!: boolean; // ✨ New property for fade-out lifecycle

            constructor() {
                this.init();
            }

            init() {
                this.alpha = 0;
                this.isDying = false; // ✨ Start in a non-dying state
                const directions: Stream['direction'][] = ['up', 'down', 'in', 'out'];
                this.direction = directions[Math.floor(Math.random() * directions.length)];

                this.z = Math.random() * 19 + 1;
                this.length = Math.floor(Math.random() * 15 + 5);
                this.fontSize = 2 + this.z * 1;
                // ✨ Slower, more relaxed speed
                this.speed = (Math.random() * 0.3 + 0.15) * (this.fontSize / 15);

                switch (this.direction) {
                    case 'down':
                    case 'up':
                        const side = Math.random() > 0.5 ? 'left' : 'right';
                        const spawnArea = width * 0.4;
                        if (side === 'left') {
                            this.x = Math.random() * spawnArea;
                        } else {
                            this.x = width - (Math.random() * spawnArea);
                        }
                        this.y = this.direction === 'down' ? Math.random() * -height : height + Math.random() * height;
                        break;
                    
                    case 'in':
                        const edge = Math.floor(Math.random() * 4);
                        if (edge === 0) {
                            this.x = Math.random() * width; this.y = 0;
                        } else if (edge === 1) {
                            this.x = width; this.y = Math.random() * height;
                        } else if (edge === 2) {
                            this.x = Math.random() * width; this.y = height;
                        } else {
                            this.x = 0; this.y = Math.random() * height;
                        }
                        this.z = 20;
                        this.speed = -0.03; // ✨ Slower speed
                        break;

                    case 'out':
                        this.x = vanishingPointX + (Math.random() - 0.5) * (width * 0.2);
                        this.y = vanishingPointY + (Math.random() - 0.5) * (height * 0.2);
                        this.z = 1;
                        this.speed = 0.03; // ✨ Slower speed
                        break;
                }

                this.symbols = Array.from({ length: this.length }).map(() => ({
                    value: characters[Math.floor(Math.random() * characters.length)],
                }));
            }

            updateAndDraw() {
                if (!ctx) return;

                // --- Lifecycle & Alpha Management ---
                if (this.isDying) {
                    // If dying, fade out
                    if (this.alpha > 0) {
                        this.alpha -= 0.02; // Speed of fade-out
                    } else {
                        // When fully faded out, re-initialize
                        this.init();
                    }
                } else {
                    // If not dying, fade in
                    if (this.alpha < 1) this.alpha += 0.05;
                }
                
                // --- Position Update ---
                let hasReachedEnd = false;
                switch (this.direction) {
                    case 'down':
                        this.y += this.speed;
                        hasReachedEnd = this.y - this.length * this.fontSize > height;
                        break;
                    case 'up':
                        this.y -= this.speed;
                        hasReachedEnd = this.y < -this.length * this.fontSize;
                        break;
                    case 'in':
                    case 'out':
                        this.z += this.speed;
                        this.fontSize = 2 + this.z * 1;

                        const dx = this.x - vanishingPointX;
                        const dy = this.y - vanishingPointY;
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        this.x += (dx / distance) * this.speed * 15;
                        this.y += (dy / distance) * this.speed * 15;

                        hasReachedEnd = (this.z < 1 || this.z > 20 || (this.x < 0 || this.x > width));
                        break;
                }
                
                // ✨ Trigger fade-out when boundary is reached
                if (hasReachedEnd && !this.isDying) {
                    this.isDying = true;
                }

                // --- Drawing ---
                ctx.font = `${this.fontSize}px monospace`;
                this.symbols.forEach((symbol, index) => {
                    const isHead = index === 0;

                    let charX = this.x;
                    let charY = this.y;
                    
                    if (this.direction === 'down') {
                        charY -= index * this.fontSize;
                    } else if (this.direction === 'up') {
                        charY += index * this.fontSize;
                    } else if (this.direction === 'in' || this.direction === 'out') {
                        const dx = this.x - vanishingPointX;
                        const dy = this.y - vanishingPointY;
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        const offset = index * this.fontSize * 0.8;
                        charX -= (dx / distance) * offset;
                        charY -= (dy / distance) * offset;
                    }
                    
                    let symbolAlpha = 1 - (index / this.symbols.length);

                    if (!isHead && Math.random() > 0.99) {
                        symbolAlpha = symbolAlpha * 1.6;
                    }

                    if (isHead) {
                        ctx.fillStyle = `rgba(229, 231, 235, ${this.alpha})`;
                    } else {
                        const finalTailAlpha = (symbolAlpha * 0.5 + 0.05) * this.alpha;
                        ctx.fillStyle = `rgba(52, 211, 153, ${finalTailAlpha})`;
                    }
                    
                    ctx.fillText(symbol.value, Math.round(charX), Math.round(charY));
                });
            }
        }

        for (let i = 0; i < streamCount; i++) {
            streams.push(new Stream());
        }

        let animationFrameId: number;
        const animate = () => {
            if (!ctx) return;
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, width, height);

            streams.forEach(stream => stream.updateAndDraw());
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
        />
    );
};

export default BinaryRain;