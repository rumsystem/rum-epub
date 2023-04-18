export const createSchema = (schema: Record<string, Array<string>>) => {
  const result: Record<string, string> = {};
  Object.entries(schema).forEach(([k, v]) => {
    result[k] = [...v].join(',');
  });
  return result;
};
