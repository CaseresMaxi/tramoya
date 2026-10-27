#!/usr/bin/env node
// Punto de entrada de la skill: el CLI está en motor/herramientas/tramoya.mjs (y cada
// proyecto lleva su copia en herramientas/tramoya.mjs). `node scripts/tramoya.mjs ayuda`.
// Se resuelve la ruta real: así anda también como bin de npm (npx, npm i -g), que lo
// llama por un enlace desde otra carpeta.
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(realpathSync(fileURLToPath(import.meta.url)));
await import(pathToFileURL(join(aqui, '..', 'motor', 'herramientas', 'tramoya.mjs')).href);
