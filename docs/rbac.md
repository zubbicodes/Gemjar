# Initial RBAC matrix

| Role | Catalogue | Pricing | Customers | Orders | Fulfilment | Finance | Integrations | Settings/Audit |
|---|---|---|---|---|---|---|---|---|
| Consumer | Read visible | Own quote | Own profile | Own | Own view | Own payment | None | None |
| B2B viewer | Account read | Account read | Account read | Account read | Account view | Invoice read | None | None |
| B2B buyer | Account read | Account read | Account edit | Create/read | Account view | Pay/invoice read | None | None |
| B2B owner | Account read | Account read | Manage members | Create/read | Account view | Terms/invoices | None | None |
| Agent | Assigned only | Assigned quote | Assigned only | Create/read assigned | Assigned view | Invoice read | None | None |
| Commerce manager | Manage | Manage | Manage | Manage | Manage | Refund request | Read/retry | Audit read |
| Integration operator | Read | Read | Read | Read | Read | Read | Manage | Audit read |
| Administrator | Manage | Manage | Manage | Manage | Manage | Manage | Manage | Manage |

Permissions are persisted as resource/action pairs. These named roles are seeded bundles; server guards evaluate permissions plus resource ownership or assignment.
