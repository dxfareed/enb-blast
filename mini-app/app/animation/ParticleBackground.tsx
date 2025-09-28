'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

class Particle {
  p5: p5;
  x: number = 0;
  y: number = 0;
  speed: number = 2;
  size: number = 150;
  opacity: number = 0;
  rotation: number = 0;

  constructor(p5: p5) {
    this.p5 = p5;
    this.reset(0);
    this.y = this.p5.random(-200, 0);
  }

  reset(containerWidth: number) {
    this.x = this.p5.random(0, containerWidth);
    this.y = -50;
    this.speed = this.p5.random(1, 3);
    this.opacity = this.p5.random(180, 255);
    this.rotation = this.p5.random(0, 360);
  }

  update(containerWidth: number, containerHeight: number) {
    this.y += this.speed;
    this.rotation += 0.5;
    if (this.y > containerHeight + 50) {
      this.reset(containerWidth);
    }
  }

  draw(img: p5.Image) {
    this.p5.push(); 
    this.p5.translate(this.x, this.y);
    this.p5.rotate(this.p5.radians(this.rotation));
    this.p5.tint(255, this.opacity); 
    this.p5.imageMode(this.p5.CENTER);
    this.p5.image(img, 0, 0, this.size, this.size);
    this.p5.pop();
  }
}

export default function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 7;
    let particleImg: p5.Image;
    let isSetupComplete = false;

    const sketch = (p: p5) => {
      let containerWidth = 0;
      let containerHeight = 0;

      p.setup = () => {
        if (containerRef.current) {
          containerWidth = containerRef.current.offsetWidth;
          containerHeight = containerRef.current.offsetHeight;
        }
        const canvas = p.createCanvas(containerWidth, containerHeight);
        canvas.position(0, 0);
        canvas.style('z-index', '1');
        canvas.style('pointer-events', 'none');

        p.loadImage('/Enb_000.png', (img) => {
          particleImg = img;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const particle = new Particle(p);
            particle.reset(containerWidth);
            particles.push(particle);
          }
          isSetupComplete = true;
        }, (err) => {
          console.error('Failed to load particle image:', err);
        });
      };

      p.draw = () => {
        if (!isSetupComplete) return;

        p.clear();

        particles.forEach(particle => {
          particle.update(containerWidth, containerHeight);
          particle.draw(particleImg);
        });
      };

      p.windowResized = () => {
        if (containerRef.current) {
          containerWidth = containerRef.current.offsetWidth;
          containerHeight = containerRef.current.offsetHeight;
          p.resizeCanvas(containerWidth, containerHeight);
        }
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.remove();
    };
  }, []);

  
  return <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 1 }} />;
}