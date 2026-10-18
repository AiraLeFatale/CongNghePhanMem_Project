# Documentation: Multilingual Automatic Narration System

Software engineering documentation for the capstone project. Diagrams are written in Mermaid and render directly on GitHub.

| # | Document | Contents |
|---|---|---|
| 1 | [01-SRS.md](01-SRS.md) | Software Requirements Specification: scope, actors, use-case diagram, functional requirements FR-01 to FR-39 traced to UC1–UC5, non-functional requirements, business rules, constraints, assumptions, traceability matrix |
| 2 | [02-design.md](02-design.md) | Software design: architecture, backend layers and modules, mobile and CMS module design, class diagram, activity diagrams (UC1–UC5), sequence diagrams, narration engine state diagrams, ERD of the actual schema, deployment diagram, design decisions |
| 3 | [03-test-plan.md](03-test-plan.md) | Test strategy, environment, 92 test cases with status (backend 43/43, CMS 36/36 unit + browser E2E, mobile 62/62 unit + 5/5 live passing on 18/10/2026; device-level app cases pending), field-test checklist |
| 4 | [04-installation.md](04-installation.md) | Installing and running the backend, environment variables, CMS and mobile setup (backend address, Expo Go vs development build, classroom demo), production deployment and backups |
| 5 | [05-user-guide.md](05-user-guide.md) | User guide for administrators (CMS) and tourists/passengers (app), with screen labels from the code; screenshots TODO |
| 6 | [06-project-management.md](06-project-management.md) | Process model, WBS, milestones, roles, risks and mitigations |
| – | [api.md](api.md) | REST API reference (public, auth, admin endpoints; request/response formats; error codes) |

Source documents from the team:
- [`../README.md`](../README.md): original architecture diagrams and ERD
- `../FocusedUseCases.docx`: Focused Use Cases UC1–UC5, v1.0 (20/09/2026)

Status (18/10/2026): backend, CMS and mobile app are implemented. The mobile app has been verified by unit and live-backend tests but not yet on a device; those cases are marked "Pending (device)". No field test at real POIs has been carried out yet.
