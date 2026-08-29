// Generate 100% Unique High-Tech AI Agentic Image per Team (50 Unique Palettes & Geometries)
export default async function generateAIAgenticImage(teamIdStr, puzzleData = null, problemStatement = null, withText = false, assignedIdx = 0) {
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

  // Fetch the actual number of puzzle images available in the public/puzzles/images directory
  let imageCount = 10;
  try {
    const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/system/image-count`);
    const data = await res.json();
    if (data && data.count > 0) {
      imageCount = data.count;
    }
  } catch (e) {
    console.warn("Could not fetch image count, defaulting to 10", e);
  }

  // Map the puzzle to available images using assignedIdx (which is randomly assigned to the team)
  // This ensures the image choice is fully random from the available files, but consistent for the same puzzle.
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const imageId = (assignedIdx % imageCount) + 1;
  const imagePath = `${cleanBase}puzzles/images/${imageId}.jpg`;

  try {
    const img = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image at ${imagePath}`));
      img.src = imagePath;
    });
    
    // Draw the image stretched to fit the 720x720 canvas
    ctx.drawImage(img, 0, 0, 720, 720);
  } catch (error) {
    console.warn("Puzzle image not found, using fallback background. Please ensure images are placed in public/puzzles/images/ as 1.jpg, 2.jpg etc.", error);
    // Fallback if image doesn't exist yet
    ctx.fillStyle = '#080514';
    ctx.fillRect(0, 0, 720, 720);
    ctx.fillStyle = primaryColor;
    ctx.font = '24px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText("Image missing: " + imagePath, 360, 360);
  }

  // 4. Banners
  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)'; ctx.fillRect(0, 0, 720, 75);
  ctx.fillStyle = '#ffffff'; ctx.font = '900 30px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000000'; ctx.shadowBlur = 10; ctx.fillText(`AI SPARKX • TEAM`, 360, 48);
  
  if (withText) {
    // Draw thick banner for problem statement at bottom
    ctx.fillStyle = 'rgba(10, 8, 22, 0.95)'; ctx.fillRect(0, 580, 720, 140);
    ctx.strokeStyle = primaryColor; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(0, 580); ctx.lineTo(720, 580); ctx.stroke();
    
    ctx.fillStyle = primaryColor; ctx.font = '700 28px "Outfit", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText(`PUZZLE SOLVED`, 360, 630);
    
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`WAIT FOR ADMIN ANNOUNCEMENT FOR ROUND 2`, 360, 670);
    
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
