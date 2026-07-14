// Phoenix P7-A — normalization server function (pure, no auth).
import { createServerFn } from "@tanstack/react-start";
import { NormalizationInputSchema } from "../domain/schemas";
import { normalize, tokenize, canonicalQuery } from "../domain/normalize";

export const normalizeQuery = createServerFn({ method: "POST" })
  .inputValidator((input) => NormalizationInputSchema.parse(input))
  .handler(async ({ data }) => {
    const normalized = normalize(data.q);
    const tokens = tokenize(data.q);
    return {
      original: data.q,
      normalized,
      canonical: canonicalQuery(data.q),
      tokens,
    };
  });
