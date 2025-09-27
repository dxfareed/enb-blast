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
    this.reset();
    this.y = this.p5.random(-200, 0);
  }

  reset() {
    this.x = this.p5.random(0, this.p5.windowWidth);
    this.y = -50;
    this.speed = this.p5.random(1, 3);
    this.opacity = this.p5.random(180, 255);
    this.rotation = this.p5.random(0, 360);
  }

  update() {
    this.y += this.speed;
    this.rotation += 0.5;
    if (this.y > this.p5.windowHeight + 50) {
      this.reset();
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
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.position(0, 0);
        canvas.style('z-index', '1');
        canvas.style('pointer-events', 'none');

        p.loadImage('/Enb_000.png', (img) => {
          particleImg = img;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle(p));
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
          particle.update();
          particle.draw(particleImg);
        });
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.remove();
    };
  }, []);

  
  return <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 1 }} />;
}