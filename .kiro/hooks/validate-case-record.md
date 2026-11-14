# Hook: Validate Case Record

## Trigger

Fires when any file under `data/` or `scripts/` is saved, and when any API route under `src/app/api/` is saved.

## Rules to enforce

Check any case record object (TypeScript type `CaseRecord` or plain object with a `year` field) in the changed file:

1. If `year >= (currentYear - 100)`, then `defendant_name` and `victim_name` must be null, unless `concluded === true` AND `source_url` is non-null.
2. `verdict` must never be null, undefined, or an empty string.
3. `source_url` must never be null, undefined, or an empty string.
4. If `count` is present and is 1 or 2, it must be set to null (suppressed).

## Action on failure

Fail the save with a clear error message naming the rule that was broken and the field value that broke it.

## Notes

This hook is part of the Kiroween hackathon submission and should be referenced in the demo as an example of Kiro enforcing data integrity rules automatically.
