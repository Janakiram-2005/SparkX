// Generate 100% Unique High-Tech AI Agentic Image per Team (50 Unique Palettes & Geometries)
export default function generateAIAgenticImage(teamIdStr, puzzleData = null, problemStatement = null, withText = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  // Convert team _id (which is a mongo object id string) to a number by taking last few chars
  let teamIdNum = 1;
  if (teamIdStr) {
    const hexSegment = teamIdStr.slice(-5);
    teamIdNum = parseInt(hexSegment, 16) || 1;
  }
  
  const themeName = puzzleData?.theme || `AI Agentic System #${teamIdNum}`;

  // Curated Dual Accent Color Palettes
  const palettes = [
    { primary: '#a855f7', secondary: '#d946ef', bgInner: '#1e0938' },
    { primary: '#06b6d4', secondary: '#38bdf8', bgInner: '#06202e' },
    { primary: '#3b82f6', secondary: '#60a5fa', bgInner: '#0a1936' },
    { primary: '#22c55e', secondary: '#4ade80', bgInner: '#062812' },
    { primary: '#f59e0b', secondary: '#fbbf24', bgInner: '#2e1c03' },
    { primary: '#ec4899', secondary: '#f472b6', bgInner: '#33081e' },
    { primary: '#10b981', secondary: '#34d399', bgInner: '#04271c' },
    { primary: '#8b5cf6', secondary: '#c084fc', bgInner: '#1b0e3d' },
    { primary: '#ef4444', secondary: '#f87171', bgInner: '#330808' },
    { primary: '#f97316', secondary: '#fb923c', bgInner: '#331304' }
  ];

  const palette = palettes[(teamIdNum - 1) % palettes.length];
  const primaryColor = puzzleData?.accentColor || palette.primary;
  const secondaryColor = palette.secondary;
  const bgInner = palette.bgInner;

  // 1. Dark Cyber Gradient Background tailored per team
  const bgGrad = ctx.createRadialGradient(360, 360, 30, 360, 360, 500);
  bgGrad.addColorStop(0, bgInner);
  bgGrad.addColorStop(0.6, '#080514');
  bgGrad.addColorStop(1, '#020106');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 720, 720);

  // 2. Background Grid / Matrix Style (5 unique geometric modes)
  const gridStyleMode = (teamIdNum % 5);
  ctx.save();
  ctx.strokeStyle = primaryColor;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.5;

  if (gridStyleMode === 0) {
    const size = 45;
    for (let y = -20; y < 720; y += size * 1.5) {
      for (let x = -20; x < 720; x += size * Math.sqrt(3)) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (gridStyleMode === 1) {
    for (let i = -700; i < 1400; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i + 700, 700);
      ctx.moveTo(i, 700); ctx.lineTo(i + 700, 0);
      ctx.stroke();
    }
  } else if (gridStyleMode === 2) {
    ctx.translate(360, 360);
    for (let r = 40; r <= 320; r += 40) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 340, Math.sin(angle) * 340); ctx.stroke();
    }
  } else if (gridStyleMode === 3) {
    for (let i = 0; i <= 720; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 720);
      ctx.moveTo(0, i); ctx.lineTo(720, i); ctx.stroke();
    }
  } else {
    ctx.translate(360, 360);
    for (let i = 0; i < 60; i++) {
      const angle = i * 0.3;
      const radius = i * 5;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // 3. Central AI Complex Geometric Generators
  ctx.save();
  ctx.translate(360, 360);
  
  // Choose complex geometry based on team ID
  const geoMode = teamIdNum % 4;

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 4;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 30;

  if (geoMode === 0) {
    // Nested Layered Hexagons (3D look)
    for(let r = 200; r > 50; r -= 40) {
      ctx.beginPath();
      for(let i = 0; i <= 6; i++) {
        const angle = i * Math.PI / 3;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      ctx.fill();
      ctx.rotate(Math.PI / 12);
    }
  } else if (geoMode === 1) {
    // Complex Spirograph Ring
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = i * 0.1;
      const x = 120 * Math.cos(3 * t) + 80 * Math.cos(7 * t);
      const y = 120 * Math.sin(3 * t) - 80 * Math.sin(7 * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
    ctx.fill();
  } else if (geoMode === 2) {
    // 3D Tesseract / Hypercube wireframe projection
    const s = 90;
    const vertices = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
      [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]
    ];
    // Scale outer and inner for 3D effect
    const proj1 = vertices.map(v => [v[0]*1.5, v[1]*1.5]);
    const proj2 = vertices.map(v => [v[0]*0.5, v[1]*0.5]);
    
    ctx.beginPath();
    // Outer cube
    ctx.moveTo(...proj1[0]); ctx.lineTo(...proj1[1]); ctx.lineTo(...proj1[2]); ctx.lineTo(...proj1[3]); ctx.closePath();
    ctx.moveTo(...proj1[4]); ctx.lineTo(...proj1[5]); ctx.lineTo(...proj1[6]); ctx.lineTo(...proj1[7]); ctx.closePath();
    // Inner cube
    ctx.moveTo(...proj2[0]); ctx.lineTo(...proj2[1]); ctx.lineTo(...proj2[2]); ctx.lineTo(...proj2[3]); ctx.closePath();
    ctx.moveTo(...proj2[4]); ctx.lineTo(...proj2[5]); ctx.lineTo(...proj2[6]); ctx.lineTo(...proj2[7]); ctx.closePath();
    // Connectors
    for(let i=0; i<4; i++) {
      ctx.moveTo(...proj1[i]); ctx.lineTo(...proj1[i+4]);
      ctx.moveTo(...proj2[i]); ctx.lineTo(...proj2[i+4]);
      ctx.moveTo(...proj1[i]); ctx.lineTo(...proj2[i]);
      ctx.moveTo(...proj1[i+4]); ctx.lineTo(...proj2[i+4]);
    }
    ctx.stroke();
  } else {
    // 8-Pointed Fractal Star
    ctx.beginPath();
    const spikes = 8;
    const outerRadius = 220;
    const innerRadius = 80;
    let rot = Math.PI / 2 * 3;
    let x = 0; let y = 0;
    const step = Math.PI / spikes;
    
    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = Math.cos(rot) * outerRadius;
        y = Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = Math.cos(rot) * innerRadius;
        y = Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
    ctx.fill();
    ctx.stroke();
  }

  // Inner glowing core for all modes
  ctx.fillStyle = secondaryColor; 
  ctx.shadowColor = secondaryColor; 
  ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 4. Banners
  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)'; ctx.fillRect(0, 0, 720, 75);
  ctx.fillStyle = '#ffffff'; ctx.font = '900 30px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000000'; ctx.shadowBlur = 10; ctx.fillText(`AI SPARKX • TEAM`, 360, 48);
  
  if (withText && problemStatement) {
    // Draw thick banner for problem statement at bottom
    ctx.fillStyle = 'rgba(10, 8, 22, 0.95)'; ctx.fillRect(0, 480, 720, 240);
    ctx.strokeStyle = primaryColor; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(0, 480); ctx.lineTo(720, 480); ctx.stroke();
    
    ctx.fillStyle = primaryColor; ctx.font = '700 24px "Outfit", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText(`PROBLEM: ${problemStatement.id}`, 360, 520);
    
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.shadowBlur = 0;
    
    // Simple text wrap for description
    const words = problemStatement.description.split(' ');
    let line = '';
    let y = 550;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > 680 && n > 0) {
        ctx.fillText(line, 360, y);
        line = words[n] + ' ';
        y += 24;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 360, y);
  } else {
    // Draw standard banner at bottom
    ctx.fillStyle = 'rgba(10, 8, 22, 0.9)'; ctx.fillRect(0, 635, 720, 85);
    ctx.fillStyle = primaryColor; ctx.font = '700 20px "Outfit", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText(themeName.toUpperCase(), 360, 675);
  }

  // Border
  ctx.strokeStyle = primaryColor; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 704, 704);

  return canvas;
}
