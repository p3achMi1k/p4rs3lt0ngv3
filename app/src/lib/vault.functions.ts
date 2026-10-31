import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type SealRow = {
  id: string;
  direction: string;
  scriptId: string;
  scriptName: string;
  options: Record<string, string | number | boolean>;
  original: string;
  result: string;
  createdAt: string;
};

type SealInput = {
  direction: "encode" | "decode" | "encrypt" | "decrypt";
  scriptId: string;
  scriptName: string;
  options: Record<string, string | number | boolean>;
  original: string;
  result: string;
};

const MAX = 20000;

function asOptions(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      out[key] = item;
    }
  }
  return out;
}

function parseSeal(input: unknown): SealInput {
  if (!input || typeof input !== "object") throw new Error("Missing seal.");
  const raw = input as Record<string, unknown>;
  const direction =
    raw.direction === "decode" ||
    raw.direction === "encode" ||
    raw.direction === "encrypt" ||
    raw.direction === "decrypt"
      ? raw.direction
      : null;
  if (!direction) throw new Error("Direction must be encode, decode, encrypt, or decrypt.");
  const scriptId = typeof raw.scriptId === "string" ? raw.scriptId.trim() : "";
  const scriptName = typeof raw.scriptName === "string" ? raw.scriptName.trim() : "";
  const original = typeof raw.original === "string" ? raw.original : "";
  const result = typeof raw.result === "string" ? raw.result : "";
  if (!scriptId || !scriptName) throw new Error("A script name is required.");
  if (!original.trim() || !result.trim()) throw new Error("Both the original and the result are required.");
  if (original.length > MAX || result.length > MAX) throw new Error("Each side must be 20,000 characters or fewer.");
  if (scriptId.length > 200 || scriptName.length > 200) throw new Error("Script name is too long.");
  return { direction, scriptId, scriptName, options: asOptions(raw.options), original, result };
}

function rowToSeal(row: {
  id: string;
  direction: string;
  script_id: string;
  script_name: string;
  options_json: string;
  original: string;
  result: string;
  created_at: string;
}): SealRow {
  let options: Record<string, string | number | boolean> = {};
  try {
    options = asOptions(JSON.parse(row.options_json));
  } catch {
    options = {};
  }
  return {
    id: row.id,
    direction: row.direction,
    scriptId: row.script_id,
    scriptName: row.script_name,
    options,
    original: row.original,
    result: row.result,
    createdAt: row.created_at,
  };
}

export const listSeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      direction: string;
      script_id: string;
      script_name: string;
      options_json: string;
      original: string;
      result: string;
      created_at: string;
    }>`
      select id, direction, script_id, script_name, options_json, original, result, created_at::text as created_at
      from seals
      where user_id = ${context.userId}
      order by created_at desc
      limit 200
    `;
    return rows.map(rowToSeal);
  });

export const addSeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseSeal(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into seals (id, user_id, direction, script_id, script_name, options_json, original, result)
      values (
        ${id},
        ${context.userId},
        ${data.direction},
        ${data.scriptId},
        ${data.scriptName},
        ${JSON.stringify(data.options)},
        ${data.original},
        ${data.result}
      )
    `;
    return { id };
  });

function sealId(input: unknown): string {
  const id =
    typeof input === "string"
      ? input
      : input && typeof input === "object" && typeof (input as { id?: unknown }).id === "string"
        ? (input as { id: string }).id
        : "";
  const trimmed = id.trim();
  if (!trimmed) throw new Error("Missing seal id.");
  return trimmed;
}

export const deleteSeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(sealId)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from seals where id = ${id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("That seal is no longer in Secrets.");
    return { id: rows[0].id };
  });

export const importSeals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object" || !Array.isArray((input as { seals?: unknown }).seals)) {
      throw new Error("This file is not a Secrets export.");
    }
    const seals = (input as { seals: unknown[] }).seals.slice(0, 100).map(parseSeal);
    if (seals.length === 0) throw new Error("The export has no seals.");
    return seals;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    for (const seal of data) {
      await sql`
        insert into seals (id, user_id, direction, script_id, script_name, options_json, original, result)
        values (
          ${crypto.randomUUID()},
          ${context.userId},
          ${seal.direction},
          ${seal.scriptId},
          ${seal.scriptName},
          ${JSON.stringify(seal.options)},
          ${seal.original},
          ${seal.result}
        )
      `;
    }
    return { imported: data.length };
  });
