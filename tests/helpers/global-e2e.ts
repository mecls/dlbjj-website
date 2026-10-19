import { startApp } from "./app";

/**
 * Arranca a app UMA vez para todos os ficheiros e2e (VITEST_E2E=1) e pára-a no
 * fim. Os testes unitários e de integração não a precisam e não a arrancam.
 */
export default async function setup(): Promise<(() => Promise<void>) | void> {
  if (process.env.VITEST_E2E !== "1") return;
  const app = await startApp();
  return async () => {
    await app.stop();
  };
}
