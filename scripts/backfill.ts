import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'vault.db');
const apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  console.error("ERROR: TMDB_API_KEY not found in environment.");
  process.exit(1);
}

const db = new Database(DB_PATH);

async function forceUpdate() {
  const entries = db.query("SELECT tmdb_id, type, name FROM media").all() as any[];
  console.log(`Force updating ${entries.length} entries...`);

  for (const entry of entries) {
    process.stdout.write(`Refreshing [${entry.type}] ${entry.name}... `);
    
    try {
      // 1. Try fetching as the existing type
      let url = `https://api.themoviedb.org/3/${entry.type}/${entry.tmdb_id}?api_key=${apiKey}`;
      let res = await fetch(url);
      let data = await res.json();

      // 2. If it fails (404), maybe the type is wrong in our DB. Try the other type.
      if (res.status === 404) {
        const otherType = entry.type === 'movie' ? 'tv' : 'movie';
        const altUrl = `https://api.themoviedb.org/3/${otherType}/${entry.tmdb_id}?api_key=${apiKey}`;
        const altRes = await fetch(altUrl);
        const altData = await altRes.json();
        
        if (altRes.ok) {
          process.stdout.write(`[FIXED TYPE TO ${otherType}] `);
          
          // Use a transaction to update all tables referencing this media
          db.transaction(() => {
            // Need to handle FK constraints: we can't easily update PK of media if rows reference it
            // So we delete and re-insert or just update if we PRAGMA foreign_keys = OFF
            db.run("PRAGMA foreign_keys = OFF");
            db.run("UPDATE media SET type = ? WHERE tmdb_id = ? AND type = ?", [otherType, entry.tmdb_id, entry.type]);
            db.run("UPDATE user_watched SET type = ? WHERE tmdb_id = ? AND type = ?", [otherType, entry.tmdb_id, entry.type]);
            db.run("UPDATE user_watchlist SET type = ? WHERE tmdb_id = ? AND type = ?", [otherType, entry.tmdb_id, entry.type]);
            db.run("UPDATE room_watched SET type = ? WHERE tmdb_id = ? AND type = ?", [otherType, entry.tmdb_id, entry.type]);
            db.run("UPDATE room_watchlist SET type = ? WHERE tmdb_id = ? AND type = ?", [otherType, entry.tmdb_id, entry.type]);
            db.run("PRAGMA foreign_keys = ON");
          })();
          
          data = altData;
          entry.type = otherType;
        }
      }

      if (data && data.vote_average !== undefined) {
        db.run(
          "UPDATE media SET critic_rating = ? WHERE tmdb_id = ? AND type = ?",
          [data.vote_average, entry.tmdb_id, entry.type]
        );
        process.stdout.write(`DONE (${data.vote_average.toFixed(1)})\n`);
      } else {
        process.stdout.write(`SKIPPED\n`);
      }
    } catch (err: any) {
      process.stdout.write(`FAILED (${err.message})\n`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 50));
  }

  console.log("\nUpdate complete.");
}

forceUpdate();
