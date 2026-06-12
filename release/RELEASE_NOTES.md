# Release Notes - AI Provider Policy Integration

## Overview

This release updates the framework operation policies and documentation to align with Google Antigravity (Anti) execution environment. It clarifies AI provider defaults and usage patterns to prevent any misunderstanding of the framework using `mock` outputs for real translation work.

## AI Provider Policy

This release is designed to run inside Google Antigravity.

- **Real Content Work**: Anti uses the currently selected Antigravity model by default and writes results to draft paths. It does not output to final without review.
- **Workflow Testing**: The `mock` provider is used only for workflow dry-runs, pipeline validation, and integration tests. It generates placeholders rather than real translations.
- **Framework External AI Providers**: Providers requiring custom API keys (e.g. OpenAI, Azure, Gemini API) are only used when configured explicitly and confirmed by the operator/user.

## Safety Defaults

```text
Real translation -> Selected Antigravity model -> Draft outputs only.
Test workflow -> Mock provider -> Safe for cost simulation.
External AI API -> Requires explicit config & confirmation.
Final translation -> Only after human review & phrase-based confirmation.
```
