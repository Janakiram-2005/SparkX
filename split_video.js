import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegStatic);

const inputPath = path.join(__dirname, 'public', 'intro.mp4');
const outputDir = path.join(__dirname, 'public', 'intro-stream');
const outputPath = path.join(outputDir, 'intro.m3u8');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Starting video HLS conversion...');

ffmpeg(inputPath, { timeout: 432000 })
  .addOptions([
    '-profile:v baseline', 
    '-level 3.0',
    '-start_number 0',
    '-hls_time 2',
    '-hls_list_size 0',
    '-f hls'
  ])
  .output(outputPath)
  .on('end', () => {
    console.log('HLS conversion completed successfully!');
    process.exit(0);
  })
  .on('error', (err) => {
    console.error('Error during conversion:', err);
    process.exit(1);
  })
  .run();
