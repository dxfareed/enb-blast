'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

// A single particle in the hydro-dip simulation
class Particle {
  p: p5;
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  maxSpeed: number;
  img: p5.Image;
  noiseScale: number;
  size: number;
  angle: number;
  angleVel: number;

  constructor(p: p5, img: p5.Image) {
    this.p = p;
    this.pos = p.createVector(p.random(p.width), p.random(p.height));
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.maxSpeed = 1.5;
    this.img = img;
    this.noiseScale = 0.005;
    this.size = p.random(50, 100);
    this.angle = p.random(p.TWO_PI);
    this.angleVel = p.random(-0.01, 0.01);
  }

  // Update particle's position based on a noise field
  update() {
    const noiseAngle = this.p.noise(this.pos.x * this.noiseScale, this.pos.y * this.noiseScale) * this.p.TWO_PI * 2;
    const force = p5.Vector.fromAngle(noiseAngle);
    force.mult(0.1);
    this.acc.add(force);

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.angle += this.angleVel;
  }

  // Draw the particle
  draw() {
    this.p.push();
    this.p.translate(this.pos.x, this.pos.y);
    this.p.rotate(this.angle);
    this.p.imageMode(this.p.CENTER);
    // Use tint to add to the fluid/watery effect
    this.p.tint(255, 150);
    this.p.image(this.img, 0, 0, this.size, this.size);
    this.p.pop();
  }

  // Handle screen edges
  edges() {
    if (this.pos.x > this.p.width + this.size) this.pos.x = -this.size;
    if (this.pos.x < -this.size) this.pos.x = this.p.width + this.size;
    if (this.pos.y > this.p.height + this.size) this.pos.y = -this.size;
    if (this.pos.y < -this.size) this.pos.y = this.p.height + this.size;
  }
}

export default function HydroDipAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let particles: Particle[] = [];
    let images: p5.Image[] = [];
    const imageUrls = ['/Enb_000.png', '/Enb_001.png', '/logo.png', '/logo1.png', '/logo2.png'];

    const sketch = (p: p5) => {
      p.preload = () => {
        for (const url of imageUrls) {
          images.push(p.loadImage(url));
        }
      };

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.position(0, 0);
        canvas.style('z-index', '-1');

        for (let i = 0; i < 30; i++) {
          particles.push(new Particle(p, p.random(images)));
        }
      };

      p.draw = () => {
        // A low-opacity background creates the smearing/fluid effect
        p.background(255, 255, 255, 40);
        for (const particle of particles) {
          particle.update();
          particle.edges();
          particle.draw();
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        particles = [];
         for (let i = 0; i < 30; i++) {
          particles.push(new Particle(p, p.random(images)));
        }
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.remove();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }} />;
}
