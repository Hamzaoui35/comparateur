// Adaptateur minimal D1 → node:sqlite pour exécuter les vraies requêtes de src/lib dans les tests.
export function d1(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      const bound = (args) => ({
        first: async () => statement.get(...args) ?? null,
        all: async () => ({ results: statement.all(...args) }),
        run: async () => statement.run(...args),
      });
      return { bind: (...args) => bound(args), ...bound([]) };
    },
  };
}
