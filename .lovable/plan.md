
1. Fix the real regression in `useDonors`
- Remove the new `profiles.select('*, user_roles!inner(role)')` query from `src/hooks/useDonors.ts`.
- That join syntax is the current failure point because `profiles` and `user_roles` do not have a PostgREST relationship in schema cache, even though the tables are logically related by `profiles.id = user_roles.user_id`.
- Restore the donor lookup to an explicit 2-step flow:
  1. fetch donor IDs from `user_roles` where `role = 'donor'`
  2. fetch matching `profiles` separately

2. Make donor fetching robust for large donor lists
- Keep the explicit `user_roles` lookup, but fetch `profiles`, `donations`, and `food_slots` in safe chunks instead of one huge `.in(...)` query.
- Use chunked donor ID batches (for example 100 IDs per batch) so the app avoids:
  - PostgREST URL-length errors
  - schema-cache join errors
  - future scaling issues as donor count grows
- Merge all chunk results in the hook before building the final donor list.

3. Fix stats loading without silent truncation
- Replace the current “fetch all donations / fetch all food_slots without filters” approach in `useDonors`.
- That version risks incomplete donor totals because Supabase/PostgREST defaults to 1000 rows per query.
- Fetch donation/food-slot stats only for the batched donor IDs, then aggregate client-side per donor.

4. Preserve the earlier donor management behavior
- Keep the existing donor mapping shape exactly the same so these screens continue to work without UI rewrites:
  - `src/pages/super-admin/DonorsList.tsx`
  - `src/components/booking/DonorFinder.tsx`
  - `src/pages/super-admin/DonorPreview.tsx`
  - `src/pages/super-admin/BookingPlatform.tsx`
- Ensure the returned donor list still contains the same profile fields plus totals and last interaction.

5. Improve error handling where donor data is consumed
- Update donor-consuming screens to distinguish:
  - loading
  - actual query error
  - empty donor results
- In particular, `DonorFinder.tsx` should stop showing “No donors available” when the hook actually failed.
- Show the real error message (or a clean fallback like “Unable to load donors right now”) so future regressions are visible immediately.

6. Validate against the current data shape
- Use the existing database reality as the source of truth:
  - donors exist in `profiles`
  - donor membership is defined by `user_roles.role = 'donor'`
- Keep the strict donor/staff separation already used across the project.

Technical details
- Root cause: the previous fix replaced a working explicit-table strategy with a PostgREST embedded join:
  `user_roles!inner(role)`
  That only works when Supabase/PostgREST exposes a relationship in schema cache. In this project, `user_roles` shows no relationship metadata for `profiles`, so the request fails with:
  “Could not find a relationship between 'profiles' and 'user_roles' in the schema cache”
- Confirmed database state:
  - `user_roles` donor rows: 652
  - joined donor profiles by `profiles.id = user_roles.user_id`: 652
  - total profiles: 663
- So the data is present; the regression is query construction, not missing donor records.
- Files to update:
  - `src/hooks/useDonors.ts` — main fix
  - `src/components/booking/DonorFinder.tsx` — proper error state
  - optionally `src/pages/super-admin/BookingPlatform.tsx` / `src/pages/super-admin/DonorPreview.tsx` if they need clearer fallback behavior from the hook
