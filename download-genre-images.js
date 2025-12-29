import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse the media-category-carousel.tsx file
const carouselFile = fs.readFileSync(
  path.join(__dirname, 'apps/web/src/features/media/components/media-category-carousel.tsx'),
  'utf8'
);

// Extract MOVIE_GENRE array
const movieGenreMatch = carouselFile.match(/const MOVIE_GENRE = \[([\s\S]*?)\];/);
const tvGenreMatch = carouselFile.match(/const TV_GENRE = \[([\s\S]*?)\];/);

function parseGenreArray(match) {
  if (!match) return [];
  
  const content = match[1];
  const genres = [];
  const genreRegex = /genre_id:\s*(\d+),\s*backdrop_path:\s*"([^"]+)"/g;
  
  let genreMatch;
  while ((genreMatch = genreRegex.exec(content)) !== null) {
    genres.push({
      genre_id: parseInt(genreMatch[1]),
      backdrop_path: genreMatch[2]
    });
  }
  
  return genres;
}

const movieGenres = parseGenreArray(movieGenreMatch);
const tvGenres = parseGenreArray(tvGenreMatch);

console.log(`Found ${movieGenres.length} movie genres`);
console.log(`Found ${tvGenres.length} TV genres`);

// Create directories
const movieDir = path.join(__dirname, 'apps/web/public/movie/category');
const tvDir = path.join(__dirname, 'apps/web/public/tv/category');

fs.mkdirSync(movieDir, { recursive: true });
fs.mkdirSync(tvDir, { recursive: true });

// Download function
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Download all images
async function downloadAll() {
  let downloaded = 0;
  let skipped = 0;
  
  // Download movie genre images
  for (const genre of movieGenres) {
    const filepath = path.join(movieDir, `${genre.genre_id}.jpg`);
    
    if (fs.existsSync(filepath)) {
      console.log(`Skipping movie genre ${genre.genre_id} (already exists)`);
      skipped++;
      continue;
    }
    
    const url = `https://image.tmdb.org/t/p/w780${genre.backdrop_path}`;
    
    try {
      await downloadImage(url, filepath);
      console.log(`Downloaded movie genre ${genre.genre_id}`);
      downloaded++;
    } catch (error) {
      console.error(`Failed to download movie genre ${genre.genre_id}:`, error.message);
    }
  }
  
  // Download TV genre images
  for (const genre of tvGenres) {
    const filepath = path.join(tvDir, `${genre.genre_id}.jpg`);
    
    if (fs.existsSync(filepath)) {
      console.log(`Skipping TV genre ${genre.genre_id} (already exists)`);
      skipped++;
      continue;
    }
    
    const url = `https://image.tmdb.org/t/p/w780${genre.backdrop_path}`;
    
    try {
      await downloadImage(url, filepath);
      console.log(`Downloaded TV genre ${genre.genre_id}`);
      downloaded++;
    } catch (error) {
      console.error(`Failed to download TV genre ${genre.genre_id}:`, error.message);
    }
  }
  
  console.log('\n=== Download Complete ===');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${downloaded + skipped}`);
}

downloadAll();

