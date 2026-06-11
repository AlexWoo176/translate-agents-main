# Release Checklist

Use this checklist to verify a book project is ready to be locked and released.

## Pre-Release Checks

- [ ] Run and pass all unit tests:
  ```bash
  npm run test:unit
  ```
- [ ] Run and pass all integration tests:
  ```bash
  npm run test:integration
  ```
- [ ] Run and pass all smoke tests:
  ```bash
  npm run test:smoke
  ```
- [ ] Run production validation:
  ```bash
  node cli/index.js validate-production <bookSlug>
  ```
  - Verify that the result status is `production_ready` or `production_ready_with_warnings` (with only accepted warnings).
  - Verify no `errors` block the build.

## Quality Gates Audit

- [ ] Verify that all 17 quality gates are completed and documented.
- [ ] Ensure that there are no remaining `failed` gates.
- [ ] Audit `localPathLeaks` gate and confirm no absolute machine paths (pointing to local disk drives) exist in config or state files.

## Dataset Safety

- [ ] Confirm no destructive overwrite without backup.
- [ ] Verify that translation changes have been committed.

## Documentation

- [ ] Keep release notes and changelog (`docs/WORKFLOW_CORE_CHANGELOG.md`) updated.
- [ ] Ensure all referenced documentation is complete.
