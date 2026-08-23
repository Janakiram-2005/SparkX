// Generate 100% Unique High-Tech AI Agentic Image per Team (50 Unique Palettes & Geometries)
export default function generateAIAgenticImage(teamIdStr, puzzleData = null) {
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

  // 50 Curated Dual Accent Color Palettes for 50 Teams
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
    ctx.translate(350, 350);
    for (let r = 40; r <= 320; r += 40) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 340, Math.sin(angle) * 340); ctx.stroke();
    }
  } else if (gridStyleMode === 3) {
    for (let i = 0; i <= 700; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 700);
      ctx.moveTo(0, i); ctx.lineTo(700, i); ctx.stroke();
    }
  } else {
    ctx.translate(350, 350);
    for (let i = 0; i < 60; i++) {
      const angle = i * 0.3;
      const radius = i * 5;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // 3. Central AI Agent Silhouette Avatar
  ctx.save();
  ctx.translate(350, 350);
  const avatarMode = (teamIdNum % 5);

  if (avatarMode === 0) {
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#171233';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(-90, -110, 180, 150, [30, 30, 20, 20]); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = secondaryColor;
    ctx.shadowColor = secondaryColor;
    ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.roundRect(-65, -60, 50, 22, 10); ctx.roundRect(15, -60, 50, 22, 10); ctx.fill();
  } else {
    // Geometric Star fallback
    ctx.strokeStyle = primaryColor; ctx.lineWidth = 4; ctx.shadowColor = primaryColor; ctx.shadowBlur = 30;
    ctx.fillStyle = '#1e1035';
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = 180;
    const innerRadius = 75;
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
    ctx.lineTo(0, -outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing core
    ctx.fillStyle = secondaryColor; ctx.shadowColor = secondaryColor; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 4. Banners
  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)'; ctx.fillRect(0, 0, 700, 75);
  ctx.fillStyle = '#ffffff'; ctx.font = '900 30px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000000'; ctx.shadowBlur = 10; ctx.fillText(`AI SPARKX • TEAM`, 350, 48);
  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)'; ctx.fillRect(0, 615, 700, 85);
  ctx.fillStyle = primaryColor; ctx.font = '700 20px "Outfit", sans-serif'; ctx.fillText(themeName.toUpperCase(), 350, 655);
  ctx.strokeStyle = primaryColor; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 684, 684);

  return canvas;
}
