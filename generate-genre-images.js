import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the movie.json file
const movieData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'movie.json'), 'utf8')
);

// Check if genre-images.json already exists and load it
const outputPath = path.join(__dirname, 'genre-images.json');
let genreBackdrops = [];
const seenGenres = new Set();

if (fs.existsSync(outputPath)) {
  console.log('Found existing genre-images.json, loading...');
  genreBackdrops = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  
  // Populate seenGenres with existing genre_ids
  for (const item of genreBackdrops) {
    seenGenres.add(item.genre_id);
  }
  console.log(`Loaded ${genreBackdrops.length} existing genre/backdrop pairs`);
}

// Process each movie
for (const movie of movieData.results) {
  // Loop through all genre_ids for this movie
  if (!Array.isArray(movie.genre_ids) || !movie.backdrop_path) {
    continue;
  }

  for (const genreId of movie.genre_ids) {
    if (!genreId) continue;
    // Only add if we haven't seen this genre before
    if (!seenGenres.has(genreId)) {
      seenGenres.add(genreId);
      genreBackdrops.push({
        genre_id: genreId,
        backdrop_path: movie.backdrop_path
      });
    }
  }
}

// Write output to file
const output = JSON.stringify(genreBackdrops, null, 2);
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`Total: ${genreBackdrops.length} unique genre/backdrop pairs`);
console.log('Output written to genre-images.json');

