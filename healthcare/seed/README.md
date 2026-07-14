# Doctor Directory Seed — Wave 1 (Aden)

Contract for CSV rows imported via `scripts/import-doctors-seed.ts`.

## Columns

| column               | type                              | notes                                              |
| -------------------- | --------------------------------- | -------------------------------------------------- |
| full_name            | string (Arabic)                   | required                                           |
| specialty            | Arabic label OR specialty.code    | must exist in `hc_specialties`                     |
| facility             | string                            | matched/created in `hc_locations`                  |
| city                 | string                            | e.g. "عدن"                                         |
| area                 | string                            | governorate/district — stored in `governorate`     |
| phone                | string (E.164 preferred)          | optional                                           |
| whatsapp             | string                            | optional                                           |
| schedule             | free text                         | parsed later into `hc_doctor_availability`         |
| experience           | int (years)                       | optional                                           |
| verification_status  | `verified` \| `pending`           | default `pending`                                  |
| source               | `hospital` \| `doctor` \| `official` \| `public` | drives trust badge |
| confidence_level     | A \| B \| C \| D                  | optional override                                  |

## Import (dry-run then commit)

```bash
bun run scripts/import-doctors-seed.ts --file healthcare/seed/aden-doctors-wave1.csv        # dry-run
bun run scripts/import-doctors-seed.ts --file healthcare/seed/aden-doctors-wave1.csv --commit
```

**Note**: importer is NOT executed in Phase 6.5-A. This is scaffold only. Committing writes to `hc_doctors`, `hc_doctor_specialties`, `hc_doctor_locations` via the service role.
