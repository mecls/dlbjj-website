import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Carrega .env.test (Supabase local, OLLAMA_FAKE=1, segredos de teste) sem
// sobrepor o que já venha do ambiente.
config({ path: fileURLToPath(new URL("../../.env.test", import.meta.url)), quiet: true });
