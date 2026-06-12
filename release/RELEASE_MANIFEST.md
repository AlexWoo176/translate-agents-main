# Release Manifest

## Metadata
- **Version**: 1.0.0
- **Environment**: Google Antigravity (Anti)
- **Primary Goal**: AI Provider Policy Alignment

## AI Provider Policy Summary

| Provider | Target | Default Behavior in Antigravity | Output Location | Cost/Risk |
|---|---|---|---|---|
| `mock` | Testing / Pipeline dry-runs | Explicit user request for testing | `05-translated-draft/` | Low |
| `manual` | Human input | Manual translation imports | `05-translated-draft/` or `05-translated/` | Low |
| `antigravity-selected-model` | Real translations / Analysis | Default for real content tasks | `05-translated-draft/` | Medium/High |
| `external-ai` | Production / External LLM API | Configured and confirmed runs | `05-translated-draft/` | High (Cost warning) |

For details, refer to:
- [Translation Provider Reference](file:///f:/LIBERO/translate-agents-main/docs/TRANSLATION_PROVIDER_REFERENCE.md)
- [Operator Prompt Playbook](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_PROMPT_PLAYBOOK.md)
