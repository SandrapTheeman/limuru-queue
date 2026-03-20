export const query = async (text: string, params?: unknown[]): Promise<{
  rows: unknown[];
  rowCount: number;
  command: string;
  oid: number;
  fields: unknown[];
}> => {
  throw new Error('Database not initialized - use mock in tests');
};

export const getClient = async () => {
  throw new Error('Database not initialized - use mock in tests');
};
