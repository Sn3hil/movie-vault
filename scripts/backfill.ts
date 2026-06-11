import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'vault.db');
const apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  console.error("ERROR: TMDB_API_KEY not found in environment.");
  console.log("Please ensure your .env file is configured or the key is exported.");
  process.exit(1);
}

const db = new Database(DB_PATH);

// Helper to check if column exists and add it if not
function ensureColumn() {
  try {
    const info = db.query("PRAGMA table_info(media)").all() as any[];
    const hasColumn = info.some(col => col.name === 'critic_rating');
    
    if (!hasColumn) {
      console.log("Adding 'critic_rating' column to media table...");
      db.run("ALTER TABLE media ADD COLUMN critic_rating REAL");
    }
  } catch (err) {
    console.error("Failed to check/add column:", err);
  }
}

async function backfill() {
  ensureColumn();

  const entries = db.query("SELECT tmdb_id, type, name FROM media WHERE critic_rating IS NULL").all() as any[];
  
  if (entries.length === 0) {
    console.log("No entries need updating.");
    return;
  }

  console.log(`Found ${entries.length} entries to backfill.`);
  let updated = 0;
  let failed = 0;

  for (const entry of entries) {
    process.stdout.write(`Updating [${entry.type}] ${entry.name}... `);
    
    try {
      const url = `https://api.themoviedb.org/3/${entry.type}/${entry.tmdb_id}?api_key=${apiKey}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`TMDB returned ${res.status}`);
      }
      
      const data = await res.json();
      const rating = data.vote_average;

      if (rating !== undefined) {
        db.run(
          "UPDATE media SET critic_rating = ? WHERE tmdb_id = ? AND type = ?",
          [rating, entry.tmdb_id, entry.type]
        );
        process.stdout.write(`DONE (${rating})\n`);
        updated++;
      } else {
        process.stdout.write(`SKIPPED (No rating found)\n`);
      }
    } catch (err: any) {
      process.stdout.write(`FAILED (${err.message})\n`);
      failed++;
    }

    // Small sleep to avoid hitting TMDB rate limits too hard
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("\nBackfill complete.");
  console.log(`Successfully updated: ${updated}`);
  console.log(`Failed/Skipped:        ${failed}`);
}

backfill();
