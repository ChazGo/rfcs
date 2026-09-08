# OpenClaw sandbox architecture visualization

This static site compares current public OpenClaw sandbox boundaries with the
proposed Agent User Gateway architecture. It is intentionally separate from RFC
0026 and is not part of that RFC's pull request.

Boundary details lead with concise effective defaults where those defaults need
review. The technical schema and lifecycle example remain available through the
detail-view toggle.

## Local preview

From the repository root:

```powershell
python -m http.server 8000 --directory visualizations\openclaw-sandbox-architecture
```

Open `http://localhost:8000`.

## Source rules

- Current behavior must link to revision-pinned public source.
- Proposed behavior must be labeled and link to its proposal revision.
- Gateway and Windows-node policy examples remain host-specific.
- Private or internal links must not be added.

The site has no third-party runtime dependencies or build step.

## Design pages

- `/` explains current and proposed Windows sandbox boundaries.
- `/access-modes/` explores the proposed first-step Minimal / YOLO execution
  choice, UI ownership, and the host-side trust boundary.
