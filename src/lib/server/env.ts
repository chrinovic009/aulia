/** Lecture des variables d'environnement (Vercel : process.env ; développement : .env). */
export function env(name: string): string | undefined {
  const v = (typeof process !== 'undefined' ? process.env[name] : undefined) ?? ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name]);
  return v === '' ? undefined : v;
}

export const isProd = () => env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production';
