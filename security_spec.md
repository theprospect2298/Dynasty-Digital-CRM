# Security Specification: Dynasty Digital CRM

## 1. Data Invariants
1. Single-User Agency Access: Only the verified agency owner (`carlosventura.fx@gmail.com`) can read or write any CRM data.
2. Unauthenticated access is completely rejected across all collections.
3. Users whose Google email is not `carlosventura.fx@gmail.com` or whose email is unverified are strictly denied read and write operations.
4. Client IDs and document IDs must be valid alphanumeric identifiers (`isValidId`).
5. Client services must reference a non-empty `clientId`.
6. Payments must have valid numeric amounts greater than 0 and a valid `clientId`.
7. Default-deny catch-all rule protects any unspecified paths.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated read to `/clients/cli_1` -> Must return `PERMISSION_DENIED`.
2. Unauthenticated write to `/payments/pay_1` -> Must return `PERMISSION_DENIED`.
3. Non-owner Google user (`attacker@gmail.com`) read to `/clients` -> Must return `PERMISSION_DENIED`.
4. Non-owner Google user (`attacker@gmail.com`) write to `/settings/agency` -> Must return `PERMISSION_DENIED`.
5. Unverified email spoof (`carlosventura.fx@gmail.com` with `email_verified: false`) write to `/catalog/cat_1` -> Must return `PERMISSION_DENIED`.
6. Malicious client creation with 500KB buffer in `businessName` -> Must return `PERMISSION_DENIED` (string size exceeded).
7. Negative or non-numeric payment amount write (`amount: -500`) -> Must return `PERMISSION_DENIED`.
8. Payment creation with invalid ID (`../../root/attack`) -> Must return `PERMISSION_DENIED` (`isValidId` check fails).
9. Malicious user attempting to claim ownership in `/allowed_users/other_user` -> Must return `PERMISSION_DENIED`.
10. Anonymous user read attempt -> Must return `PERMISSION_DENIED`.
11. Blanket write to arbitrary collections `/secrets/data` -> Must return `PERMISSION_DENIED` (default-deny catch-all).
12. Attempt to write shadow fields not allowed in blueprint schema -> Must return `PERMISSION_DENIED`.
