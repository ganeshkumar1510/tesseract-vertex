// This is a placeholder for your database connection.
// For a production app on Vercel, we recommend using Supabase or Vercel Postgres.

export const db = {
  get: async (query, params) => {
    console.log('DB GET:', query, params);
    // Return mock user for local development if needed
    return null; 
  },
  run: async (query, params) => {
    console.log('DB RUN:', query, params);
    return { lastID: Math.floor(Math.random() * 1000) };
  },
  all: async (query, params) => {
    console.log('DB ALL:', query, params);
    return [];
  }
};
