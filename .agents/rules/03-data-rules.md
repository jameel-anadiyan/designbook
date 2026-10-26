# Data rules

- Design statuses: `available`, `on_hold`, `requested`, `in_transfer`, `sold`, `deleted`.
  Only `available` is requestable.
- No quantity: one design row = one physical piece.
- SKU (uppercase) and barcode are unique across the business.
- MRP > 0, entered twice in the UI (confirm field has paste disabled) and must match.
- No shop deletes, ever. HO/Admin soft-delete with a reason (`soft_delete_design`), admin can restore.
- Mark sold requires invoice number + invoice file; enforced by a CHECK constraint and the RPC.
- Holds: 1–30 days, reason (≥ 5 chars) + document, `hold_no` = count of previous holds of that design
  at that outlet + 1; auto-release by pg_cron hourly.
- Reject a request: reason + document + 1–30 hold days; places a numbered hold (source = 'rejection').
- Age: `age_days = today − location_since`. Reset on upload, on receipt by requester, on HO relocation.
  Return to origin restores `prev_location_since` (age continues).
- One open transfer per design. One open image vote per user per design.
- Currency INR with Indian digit grouping (₹ 1,24,500). Dates shown in IST (Asia/Kolkata).
