import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// O Supabase local e os segredos de teste vivem no .env.test da raiz do repo.
config({ path: fileURLToPath(new URL("../../.env.test", import.meta.url)), quiet: true });
process.env.WORKER_HUMANIZE ??= "0"; // sem atrasos nos testes
process.env.LOG_LEVEL ??= "error";
