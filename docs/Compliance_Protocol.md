# 🔒 Compliance Protocol

## DPDP Act 2023 Mandate
Explicit consent must be obtained before processing any personal data. This is enforced via the mandatory checkbox on the Login/Registration screen.

## Security Implementation
*   **Session Security**: 30-minute hard timeout on inactivity.
*   **Input Sanitization**: Strict Regex for MRNs and Phones to prevent injection.
*   **Audit Trail**: Immutable logs for every login, prescription, and dispensing event stored in `audit_logs` table.
*   **Encrypted Storage**: All PHI is encrypted at rest and in transit.
