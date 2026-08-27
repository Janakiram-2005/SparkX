import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Login'; // We will render this inside the CTA
import './LandingPage.css'; // New GSAP & specific styles

const LandingPage = ({ onTeamAuthenticated, showLogin, onShowLogin }) => {
  const navigate = useNavigate();
  const kineticRef = useRef(null);
  const watermarkRef = useRef(null);
  const roundsRef = useRef(null);

  useEffect(() => {
    // Register GSAP plugins
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const SplitText = window.SplitText;
    const ScrambleTextPlugin = window.ScrambleTextPlugin;

    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      if (SplitText) gsap.registerPlugin(SplitText);
      if (ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);

      // --- NEW: Custom SplitText Animation for Hero Title ---
      gsap.fromTo(".title-word", 
        { opacity: 0, y: 50 },
        { 
          opacity: 1, y: 0, 
          duration: 1, 
          stagger: 0.2, 
          ease: "back.out(1.7)",
          delay: 0.2
        }
      );

      // Watermark Parallax Animation
      gsap.to(watermarkRef.current, {
        yPercent: 30,
        rotation: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        }
      });

      // Round Cards Timeline Animation
      const cards = gsap.utils.toArray('.round-card');
      gsap.fromTo(cards, 
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: roundsRef.current,
            start: 'top 80%',
          }
        }
      );

      // Kinetic Text removed since we switched to Video
    }

    // Canvas Falling Starfield Background Animation
    const canvas = document.getElementById('bg-canvas-landing');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? '#a855f7' : '#ff6600',
      speedY: Math.random() * 1.5 + 0.5, // Falling speed
      speedX: Math.random() * 0.5 + 0.1  // Slight rightward drift
    }));

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around when falling off screen
        if (p.y > canvas.height) p.y = 0;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Add a slight glow/trail effect to the stars
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
      });

      // Draw faint connecting lines for a "river of data" effect
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Only connect vertically-aligned stars that are close
          if (dist < 100 && Math.abs(dx) < 30) {
            ctx.strokeStyle = `rgba(168, 85, 247, ${1 - dist / 100})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
          }
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

      return () => {
        window.removeEventListener('resize', resize);
        if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(t => t.kill());
        cancelAnimationFrame(animationFrameId);
      };
  }, []);

  return (
    <div className="landing-layout">
      {/* Scroll Watermark */}
      <img 
        ref={watermarkRef}
        src="/sparkx-brush-logo.png" 
        className="watermark-bg" 
        alt="AI SparkX Watermark" 
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          opacity: 0.15,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <canvas id="bg-canvas-landing" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: 10, pointerEvents:'none'}}></canvas>
      
      <section id="screen-landing" className="screen active" style={{ display: 'block', minHeight: '100vh', position: 'relative', zIndex: 2, paddingTop: 0 }}>
        <div className="grain"></div>
        <svg className="circuit-bg" id="bgCircuit" xmlns="http://www.w3.org/2000/svg">
          {/* Faint background circuit paths - simplified for React */}
          <path d="M 100 200 L 220 200 L 260 240 L 420 240" stroke="#7C4DFF" strokeWidth="1" fill="none" opacity="0.10" />
          <path d="M 800 400 L 920 400 L 960 440 L 1120 440" stroke="#FF6A2B" strokeWidth="1" fill="none" opacity="0.10" />
        </svg>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100vw', margin: '0 calc(-50vw + 50%)', padding: '15px 2rem', boxSizing: 'border-box', background: 'rgba(11,10,22,0.75)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="dept-logos" style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo.webp" alt="Vignan Logo" style={{ height: '90px', objectFit: 'contain' }} />
            <img src="/1.png" alt="CSE Logo" style={{ height: '90px', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', letterSpacing: '4px', color: '#fff', textShadow: '0 0 15px rgba(168, 85, 247, 0.8)', whiteSpace: 'nowrap' }}>
            AGENTIC AI DAY <span style={{ color: 'var(--purple-neon)' }}>2026</span>
          </div>
          <nav style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '2rem' }}>
            <a href="#about">About</a>
            <a href="#rounds">Rounds</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <main>
          {/* HERO */}
          <section className="hero">
            <div>
              <div className="dept-line" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--purple-neon)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>
                <b style={{ color: '#fff' }}>Dept. of CSE</b> <span style={{ color: 'var(--text-muted)' }}>presents</span>
              </div>
              <h1 className="hero-title">
                <span className="line1 title-word">AI SparkX</span>
                <span className="line2 title-word">Challenge</span>
              </h1>
              <p className="hero-desc">An AI-powered design thinking ideathon. Identify real-world problems, ideate innovative solutions, and create impact — using Design Thinking and AI, in three fast rounds.</p>

              <div className="hero-dates">
                <div className="hero-date"><span className="lbl">REGISTER BEFORE</span><span className="val">26 Aug 2026</span></div>
                <div className="hero-date"><span className="lbl">EVENT DATE</span><span className="val">29 Aug 2026</span></div>
                <div className="hero-date"><span className="lbl">OPEN TO</span><span className="val">All CSE students &amp; faculty</span></div>
              </div>
            </div>

            <div className="hero-visual" style={{ position: 'relative', zIndex: 2 }}>
              <video 
                src="/hero-cube.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                style={{
                  width: '320px',
                  height: '320px',
                  objectFit: 'cover',
                  borderRadius: '24px',
                  filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.2))'
                }}
              />
            </div>
          </section>

          {/* ABOUT */}
          <section className="section" id="about">
            <div className="section-label">THE BRIEF</div>
            <h2 className="section-title reveal in">One day. Three rounds. One real problem worth solving.</h2>
            <p className="section-intro reveal in">SparkX is built around a simple idea: agentic AI is only as good as the thinking behind it. Teams work through a puzzle, a real-world problem, and a design-thinking sprint — then pitch a solution built with the help of AI tools.</p>

            <div className="about-grid">
              <div className="about-card reveal in">
                <div className="num">TEAM</div>
                <h3>2&ndash;3 members</h3>
                <p>Small enough to move fast, big enough to cover ideation, build, and pitch.</p>
              </div>
              <div className="about-card reveal in">
                <div className="num">ELIGIBILITY</div>
                <h3>All CSE students &amp; faculty</h3>
                <p>Open across the department — undergrad, postgrad, and faculty teams welcome.</p>
              </div>
              <div className="about-card reveal in">
                <div className="num">AI USAGE</div>
                <h3>Any AI tool, allowed</h3>
                <p>Use whatever AI tools and applications help you build and present your solution.</p>
              </div>
            </div>
          </section>

          {/* ROUNDS */}
          <section className="section" id="rounds" ref={roundsRef}>
            <div className="section-label">HOW IT RUNS</div>
            <h2 className="section-title reveal in">Three rounds, one current running through all of them.</h2>
            <p className="section-intro reveal in" style={{ marginBottom: '2.5rem', color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '800px' }}>
              Your team will navigate through intensive puzzle solving, creative design thinking, and a final pitch presentation to expert judges. Every step requires agentic AI tools to succeed.
            </p>

            <div className="timeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', position: 'relative', marginBottom: '3rem' }}>
              <div className="round-card" style={{ background: 'rgba(15,23,42,0.6)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="round-node active" style={{ width:'40px',height:'40px',borderRadius:'50%',border:'2px solid var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1rem', position: 'relative' }}>01<div className="pulse" style={{position:'absolute',inset:'-5px',borderRadius:'50%',border:'1px solid var(--orange)',animation:'pulseOpacity 2s infinite'}}></div></div>
                <div className="round-time" style={{ fontSize:'0.75rem',color:'#f97316',fontWeight:700,letterSpacing:'1px',marginBottom:'0.5rem' }}>ROUND 1 &middot; 10 MINUTES</div>
                <div className="round-title" style={{ fontSize:'1.4rem',fontWeight:700,marginBottom:'1rem',color:'#fff' }}>Decode the Chaos</div>
                <div className="round-desc" style={{ color:'#94a3b8',lineHeight:1.6, marginBottom: '1rem' }}>Teams will receive an AI-based puzzle. Analyze and decode clues to reveal a hidden real-world problem and formulate a clear problem statement.</div>
                <ul style={{ color: '#94a3b8', fontSize: '0.9rem', paddingLeft: '1.2rem' }}>
                  <li>Observation & pattern identification</li>
                  <li>Problem discovery & formulation</li>
                </ul>
              </div>

              <div className="round-card" style={{ background: 'rgba(15,23,42,0.6)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="round-node" style={{ width:'40px',height:'40px',borderRadius:'50%',border:'2px solid var(--violet)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1rem', color:'var(--violet)' }}>02</div>
                <div className="round-time" style={{ fontSize:'0.75rem',color:'#f97316',fontWeight:700,letterSpacing:'1px',marginBottom:'0.5rem' }}>ROUND 2 &middot; 45 MINUTES</div>
                <div className="round-title" style={{ fontSize:'1.4rem',fontWeight:700,marginBottom:'1rem',color:'#fff' }}>Design the Intelligence</div>
                <div className="round-desc" style={{ color:'#94a3b8',lineHeight:1.6, marginBottom: '1rem' }}>Use Design Thinking (Empathize &rarr; Define &rarr; Ideate &rarr; Prototype) to design an AI-powered solution. No coding required. Focus on feasibility, limitations, and expected impact.</div>
              </div>

              <div className="round-card" style={{ background: 'rgba(15,23,42,0.6)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="round-node" style={{ width:'40px',height:'40px',borderRadius:'50%',border:'2px solid var(--violet)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1rem', color:'var(--violet)' }}>03</div>
                <div className="round-time" style={{ fontSize:'0.75rem',color:'#f97316',fontWeight:700,letterSpacing:'1px',marginBottom:'0.5rem' }}>ROUND 3 &middot; 2-3 MINS / TEAM</div>
                <div className="round-title" style={{ fontSize:'1.4rem',fontWeight:700,marginBottom:'1rem',color:'#fff' }}>Sell Your Intelligence</div>
                <div className="round-desc" style={{ color:'#94a3b8',lineHeight:1.6, marginBottom: '1rem' }}>No PPT. No Laptop. Oral pitch only. Cover the problem, importance, users, AI solution, and impact. Followed by AI Crossfire (Jury questioning on ethics, feasibility, and data).</div>
              </div>
            </div>

            <div className="prizes-section" style={{ background: 'rgba(15,23,42,0.4)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ color: '#fff', marginBottom: '1.5rem', letterSpacing: '2px' }}>TOP 3 AI INNOVATORS PRIZES</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', color: 'var(--purple-neon)' }}>
                <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹3000</div><div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1ST PLACE</div></div>
                <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹2000</div><div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>2ND PLACE</div></div>
                <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹1000</div><div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>3RD PLACE</div></div>
              </div>
            </div>
          </section>

          {/* CTA / LOGIN SECTION */}
          <div className="cta-band reveal in" id="login-section">
            <h2>Bring your team. Bring the spark.</h2>
            <p>Registration closes 26 August 2026. Rounds begin 29 August — puzzle first, presentation last.</p>
            
            <button 
              className="btn-primary landing-start-btn" 
              onClick={() => navigate('/instructions')}
              style={{ cursor: 'pointer', marginTop: '1rem' }}
            >
              <span>Ready for Round - 01</span> &rarr;
            </button>
          </div>

        </main>

        <footer id="contact" style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto auto', 
          gap: '2rem',
          padding: '4rem 2rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: '4rem'
        }}>
          <div className="footer-left" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="footer-motto">
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Think different.</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Create impact.</div>
              <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: '1.2rem' }}>Spark the future.</div>
            </div>
          </div>

          <div className="footer-faculty">
            <h4 style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Faculty Coordinators</h4>
            <div className="contacts" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Mrs. Sk. Nazeema</strong>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>+91 96188 96300</span>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Ms. G. Tejaswi</strong>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>+91 93980 46056</span>
              </div>
            </div>
          </div>

          <div className="footer-students">
            <h4 style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Student Coordinators</h4>
            <div className="contacts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Aparna (student):</strong>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '1.1rem', borderBottom: '1px solid #fbbf24', paddingBottom: '2px' }}>+91 85238 13227</span>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Dileep (student):</strong>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '1.1rem', borderBottom: '1px solid #fbbf24', paddingBottom: '2px' }}>+91 93939 040030</span>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Janaki Ram(student):</strong>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '1.1rem', borderBottom: '1px solid #fbbf24', paddingBottom: '2px' }}>+91 91820 40905</span>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'white' }}>Shanmukha Pavan (student):</strong>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '1.1rem', borderBottom: '1px solid #fbbf24', paddingBottom: '2px' }}>+91 98499 80887</span>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingPage;
