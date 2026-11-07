# Approved E-QUIP design and implementation plan

Goal: convert the supplied E-QUIP-final.html into a school-project demonstration using React/Vite, Supabase Auth/PostgreSQL/Storage, and protected backend account operations. User approved this approach and immediate reservation on approval. User confirmed Philippine school timezone and authorized a separate zero-cost project.

Alternatives considered: managed React/Supabase (selected for lower setup/maintenance burden) and Laravel/MySQL (more conventional server setup). Preserve the prototype's visual identity. No unrelated redesign or school production integration.

Database: profiles, equipment, borrow_requests, loans, maintenance_records, notifications, audit_logs. Auth manages credentials. One request covers one physical asset. UUIDs identify records; asset numbers are unique; names never serve as foreign keys.

Roles: administrator manages everything; inventory staff manages operations and reports; borrowers browse assets and access their own requests/loans/notifications. Role and activation checks run in the backend. Users cannot promote themselves.

Request states: Pending → Approved → Released → Returned, with rejection/cancellation before handover. Approval reserves immediately; pending requests may compete. Exactly one active reservation/open loan per asset. Release and return record server timestamps, staff identity, condition, and accessories. Damaged return opens maintenance atomically. Overdue derives from open loans after the inclusive due date ends in Asia/Manila.

Implementation sequence:

- [x] Authentication, protected profiles, application shell.
- [x] Inventory, photo storage, search/edit/archive, equipment details.
- [x] Requests, rejection reasons, cancellation, immediate reservations.
- [x] Atomic release/return and conflict prevention.
- [x] Maintenance, resolution, QR generation/scanning/manual lookup.
- [x] Role dashboards, notifications, CSV reports, audit history.
- [x] Protected account creation/reset, role/activation management.
- [ ] Final verification and private hosting handoff.

Required checks: borrower RLS, direct-write denial, simultaneous approvals, repeated release/return, Philippine-midnight boundaries, repair availability, account deactivation/final-administrator protection, full DOM/API flow, photo restrictions and private reads. Visual browser and real phone camera checks are separate verification limitations when desktop controls are unavailable.

Non-goals: email/SMS, scheduled reminders, fines, multi-school support, multi-item requests, date-based future reservations. Use fictional records and existing free resources; no paid changes without user agreement.
