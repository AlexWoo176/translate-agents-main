# Glossary Change Policy

This policy document governs modifications made to the book glossaries. Standardizing safety behaviors prevents unexpected modifications to finalized translation datasets.

## 1. Safe Defaults

- **No Automatic Translation Rewrites**: Modifying terms in `glossary.csv` does **not** automatically trigger modifications to draft or final translation HTML files.
- **Draft vs. Final Isolation**:
  - Operators may apply changes to draft translations (`05-translated-draft/`) using the `--apply-to-draft` command.
  - Applying glossary updates to final translations (`05-translated/`) is blocked by default. It requires the explicit `--apply-to-final` flag along with the `--confirm-final` confirmation flag.

## 2. Required Execution Steps

When a glossary change is requested:

1. **Backup**: A timestamped CSV/JSON snapshot is written to `glossary/versions/`.
2. **Diff Report**: A semantic report of additions, updates, and status transitions is generated.
3. **Impact Analysis**: The codebase checks which chapters contain the modified terms.
4. **Draft Application**: Apply changes to draft translations first.
5. **Re-Review**: Re-run the review phase on affected chapters.
6. **Rebuild**: Rebuild preview HTML and export EPUB files to align all outputs.
