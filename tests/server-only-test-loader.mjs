import { registerHooks } from "node:module";

// Next.js treats `server-only` as a compile-time boundary marker. The Node.js
// integration test imports the server DAL directly, so resolve only that
// marker to an empty test module without changing application dependencies.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        url: "data:text/javascript,export%20{}",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
