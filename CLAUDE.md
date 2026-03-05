# CLAUDE.md — CareConnect

This file provides guidance for AI assistants (Claude and others) working in this repository. Keep it up to date as the project evolves.

---

## Project Overview

**CareConnect** is a healthcare connectivity platform. Its purpose, architecture, and tech stack should be documented here as the project is established.

> **Note for contributors:** This file was generated when the repository was empty. Update every section below as the codebase grows.

---

## Repository Structure

```
careconnect/
├── CLAUDE.md           # This file
├── README.md           # Human-facing project documentation (add when ready)
├── .env.example        # Environment variable template (add when ready)
├── .gitignore
└── ...                 # Source directories to be added
```

Update this tree whenever new top-level directories are introduced.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| _TBD_ | _TBD_ |

Document the chosen languages, frameworks, databases, and infrastructure here once decided.

---

## Development Setup

### Prerequisites

List required tools and their minimum versions here (e.g., Node.js ≥20, Python ≥3.12, Docker, etc.).

### Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd careconnect

# Copy environment variables
cp .env.example .env
# Fill in required values in .env

# Install dependencies (update command for chosen stack)
# npm install  |  pip install -r requirements.txt  |  cargo build

# Run development server
# npm run dev  |  python manage.py runserver  |  etc.
```

### Environment Variables

Document all required environment variables in `.env.example`. Never commit real secrets.

---

## Git Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/patient-search` |
| Bug fix | `fix/<short-description>` | `fix/auth-token-expiry` |
| Chore / Infra | `chore/<short-description>` | `chore/update-deps` |
| AI-generated | `claude/<task-id>` | `claude/claude-md-xxx` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
```
feat(auth): add OAuth2 login with Google
fix(api): handle null patient ID in search endpoint
docs: update setup instructions in CLAUDE.md
```

### Pull Request Process

1. Branch off `main` (or the designated base branch).
2. Keep PRs focused — one logical change per PR.
3. All CI checks must pass before merging.
4. At least one human review required for production-impacting changes.
5. Squash-merge preferred to keep `main` history clean.

---

## Coding Conventions

### General

- Prefer clarity over cleverness; code is read far more than written.
- No commented-out dead code — delete it, git tracks history.
- Keep functions small and single-purpose.
- Validate all external inputs (user input, API responses, env vars) at system boundaries.
- Never log sensitive data (PII, PHI, passwords, tokens).

### Healthcare / Compliance Considerations

- Treat all patient data as **PHI** (Protected Health Information) by default.
- Never persist PHI in logs, error messages, or analytics events.
- Encryption at rest and in transit is mandatory for any PHI-adjacent data stores.
- Document any HIPAA-relevant decisions as ADRs (Architecture Decision Records) in `/docs/adr/`.

### Security

- Sanitize and validate all user-supplied data server-side — never trust the client.
- Use parameterized queries / ORMs to prevent SQL injection.
- Set `Content-Security-Policy`, `X-Frame-Options`, and other security headers.
- Rotate secrets via environment variables, never hardcode them.
- Dependency vulnerabilities: run `npm audit` / `pip-audit` / equivalent before merging.

---

## Testing

### Philosophy

- Write tests for every non-trivial function, especially business logic.
- Prefer unit tests for pure logic, integration tests for API/DB interactions.
- Aim for meaningful coverage, not 100% coverage theater.

### Running Tests

```bash
# Update these commands for the chosen stack
npm test          # or pytest / cargo test / etc.
npm run test:e2e  # end-to-end tests if applicable
```

### Test File Conventions

- Place tests adjacent to the code they test **or** in a mirrored `tests/` directory — pick one and be consistent.
- Name test files `*.test.ts` / `*_test.py` / `*_spec.rb` etc. per language convention.
- Each test should describe **what** is being tested and **why** it matters, not just mechanically call a function.

---

## CI/CD

Document the CI/CD pipeline here once configured (GitHub Actions, CircleCI, etc.).

Expected pipeline stages:
1. Lint & format check
2. Unit tests
3. Integration tests
4. Build / compile
5. (On merge to `main`) Deploy to staging
6. (Manual gate) Deploy to production

---

## Architecture Decisions

Record significant decisions in `/docs/adr/` using the [MADR template](https://adr.github.io/madr/).

Each ADR covers: **Context → Decision → Consequences**.

---

## Common Tasks for AI Assistants

When working in this repository as an AI assistant, follow these guidelines:

### Do

- Read existing files before editing them.
- Match the style, naming conventions, and patterns already established in the file being modified.
- Run the project's linter and tests after making changes (once configured).
- Keep changes minimal and focused on the task at hand.
- Update this CLAUDE.md when you add a new major directory, dependency, or convention.
- Use `git status` / `git diff` to review changes before committing.

### Do Not

- Commit secrets, API keys, or PHI to the repository.
- Refactor code unrelated to the current task.
- Add speculative abstractions or features not requested.
- Force-push to `main` or any protected branch.
- Delete files without confirming they are no longer needed.

### Sensitive Domains

This project operates in healthcare. Extra care is required when:
- Handling patient records, appointments, or medical history.
- Integrating with external EMR/EHR systems.
- Implementing authentication and authorization flows.
- Logging or tracing requests that may contain PHI.

Always err on the side of privacy and compliance.

---

## Key Files & Entry Points

> Update this section as the project grows.

| File/Directory | Purpose |
|---------------|---------|
| _(none yet)_ | _(repository is empty)_ |

---

## Dependency Management

- Pin direct dependencies to exact versions in lockfiles (`package-lock.json`, `poetry.lock`, etc.).
- Document why unusual or non-standard packages are used.
- Remove unused dependencies promptly.

---

## Glossary

| Term | Definition |
|------|-----------|
| PHI | Protected Health Information — any individually identifiable health data |
| EMR | Electronic Medical Record |
| EHR | Electronic Health Record |
| HIPAA | Health Insurance Portability and Accountability Act |

---

_Last updated: 2026-03-05 by Claude (initial scaffold — repository was empty at time of creation)._
