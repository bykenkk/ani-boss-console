import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const source = new URL("../src/", import.meta.url);
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/"))
    return { url: new URL(`${specifier.slice(2)}.ts`, source).href, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL) {
    const candidate = new URL(specifier, context.parentURL);
    if (!candidate.pathname.endsWith(".ts") && existsSync(fileURLToPath(candidate) + ".ts"))
      return { url: pathToFileURL(fileURLToPath(candidate) + ".ts").href, shortCircuit: true };
  }
  return next(specifier, context);
}
