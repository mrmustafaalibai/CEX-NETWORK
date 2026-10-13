# CEX Network Security Specification & Attack Threat Model

## 1. Data Invariants & Zero-Trust Constraints

1. **Balance & Ledger Integrity**: An ordinary user can NEVER directly update their own or any other user's `balancePkr`, `pendingBalancePkr`, `totalDepositedPkr`, or `totalWithdrawnPkr` in `/users/{userId}`. Only authorized administrators or server-side atomic operations can execute balance credits, adjustments, or payout debits.
2. **Deposit Approval Gate**: An ordinary user can submit a deposit in `pending` status only. A user cannot set `status: "approved"` or modify `amountPkr` after creation. Duplicate approvals or self-approvals are strictly blocked.
3. **Withdrawal Reservation Gate**: A user cannot update withdrawal status to `paid` or `rejected`, or alter payment account fields once submitted.
4. **Ledger Immutability**: Documents in `/ledgerEntries/{entryId}` are strictly append-only or admin-audited; ordinary users cannot fabricate ledger entries or rewrite historical transactions.
5. **Admin RBAC Isolation**: Admin rights require existing document membership at `/admins/{userId}`. Bootstrapped admin email (`mrmustafaalibaii@gmail.com`) is guarded and validated.
6. **PII and Private Isolation**: Ordinary users can only read their own user document (`request.auth.uid == userId`), their own deposits, their own withdrawals, their own user plans, their own support tickets, and their own ledger entries.
7. **Referral Attribution Invariant**: A user cannot refer themselves (`referrerId != refereeId`). Referral codes must be verified.
8. **Plan Immutability**: Catalog investment plans at `/plans/{planId}` and payment accounts at `/paymentMethods/{methodId}` are read-only for public/authenticated users, and writeable only by verified admins.

---

## 2. The "Dirty Dozen" Payloads

The following 12 attack vectors represent adversarial payloads designed to break Identity, Integrity, and State:

1. **Self-Balance Elevation Attack**:
   `PATCH /users/victim123` with `{ "balancePkr": 9999999 }` by `victim123`.
   *Expected*: PERMISSION_DENIED.

2. **Self-Admin Role Escalation**:
   `POST /admins/attackerUid` with `{ "uid": "attackerUid", "role": "superadmin" }` by unprivileged user.
   *Expected*: PERMISSION_DENIED.

3. **Deposit Self-Approval Attack**:
   `PATCH /deposits/dep123` with `{ "status": "approved", "adminRemarks": "Self credited" }` by deposit owner.
   *Expected*: PERMISSION_DENIED.

4. **Fake Transaction Ledger Injection**:
   `POST /ledgerEntries/fake123` with `{ "userId": "attackerUid", "type": "deposit", "amountPkr": 500000, "status": "completed" }` by non-admin.
   *Expected*: PERMISSION_DENIED.

5. **Cross-User Withdrawal Data Snooping**:
   `GET /withdrawals/user456_withdraw` by `attackerUid`.
   *Expected*: PERMISSION_DENIED.

6. **Cross-User Profile Hijack**:
   `PATCH /users/victim456` with `{ "displayName": "Pawned" }` by `attackerUid`.
   *Expected*: PERMISSION_DENIED.

7. **Negative or Zero Deposit Injection**:
   `POST /deposits/depBad` with `{ "amountPkr": -5000, "status": "pending" }`.
   *Expected*: PERMISSION_DENIED.

8. **Plan Definition Tampering**:
   `PATCH /plans/plan_gold` with `{ "expectedReturnRate": 900 }` by standard investor.
   *Expected*: PERMISSION_DENIED.

9. **Payment Account Redirection Attack**:
   `PATCH /paymentMethods/easypaisa_1` with `{ "accountNumber": "03009999999" }` by regular user.
   *Expected*: PERMISSION_DENIED.

10. **Audit Log Erasure Attack**:
    `DELETE /adminAuditLogs/log_abc` by any user.
    *Expected*: PERMISSION_DENIED.

11. **Self-Referral Loop Attack**:
    `POST /referrals/ref_loop` with `{ "referrerId": "uidA", "refereeId": "uidA" }`.
    *Expected*: PERMISSION_DENIED.

12. **Ghost Field Poisoning Attack (Shadow Update)**:
    `PATCH /users/uidA` with `{ "displayName": "Valid", "isAdmin": true, "vipTier": 99 }`.
    *Expected*: PERMISSION_DENIED (strict hasOnly / affectedKeys constraint).
