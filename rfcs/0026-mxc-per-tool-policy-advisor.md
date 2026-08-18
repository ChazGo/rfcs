---
title: MXC Per-Tool Sandbox Configuration
authors:
  - Chaz Gordish
created: 2026-07-21
last_updated: 2026-08-18
status: draft
issue:
rfc_pr: https://github.com/ChazGo/rfcs/pull/1
---

# Proposal: MXC Per-Tool Sandbox Configuration

## Summary

Add an MXC-owned configuration advisor that selects a sandbox configuration for
each OpenClaw tool call before execution. Configurations can match a specific
tool and argument set or all calls to a tool.

The stored value is a fragment of MXC `ContainerConfig`. It is composed with
the existing shared MXC baseline configuration and the invoking agent's
resolved sandbox settings. A per-tool configuration may only restrict the
access those existing settings permit.

Configuration state is stored in OpenClaw's SQLite state database and is
managed by the user through supported OpenClaw surfaces. MXC denial capture can
identify access blocked by a per-tool configuration. OpenClaw can then offer
`Deny`, `Allow once`, or `Always allow`. The sandboxed tool process that
encountered the denial has already exited, so approval starts a new execution
with the approved configuration. A separate permissive auditing flow can
observe allowed access and propose a configuration for review.

## Motivation

OpenClaw currently applies one MXC sandbox backend configuration broadly.
Different tools, or different calls to the same tool, can require different
filesystem, network, capability, and timeout access.

For example, an `exec` call that reads repository status should not
automatically receive the same containment grants as an `exec` call that builds
the repository or modifies files. Per-tool sandbox configuration allows
OpenClaw to request the intended access for the individual call.

The configuration decision also needs to remain close to the component that
applies the resulting containment. The MXC plugin already owns MXC backend
integration, while OpenClaw owns tool identity, agent sessions, and persistent
application state. Keeping the configuration advisor in the OpenClaw MXC
plugin provides one ownership boundary for local configuration and MXC
enforcement.

The initial behavior should remain compatible when no per-tool configuration
exists. Enabling the configuration advisor must not unexpectedly stop existing
tool workflows.

## Goals

- Select a sandbox configuration for each OpenClaw tool call.
- Keep configuration selection and MXC enforcement in the OpenClaw MXC plugin.
- Support exact and per-tool wildcard configuration matching.
- Allow calls with no matching configuration to preserve existing behavior.
- Persist mutable per-tool sandbox configurations in OpenClaw's SQLite state
  database.
- Prevent sandboxed tool processes from writing the SQLite entries that store
  per-tool sandbox configurations.
- Compose the shared MXC baseline, resolved per-agent sandbox settings, and
  tool-specific restrictions.
- Validate configuration authorization again at the MXC execution boundary.
- Fail the tool call when MXC cannot create the requested sandbox.
- Support MXC block-mode approval and permissive allow-mode auditing.
- Record metadata-only audit events without storing raw tool arguments.
- Provide CLI commands for configuration inspection and management.

## Non-Goals

- Change the existing per-agent sandbox settings.
- Change the shared MXC baseline configuration.
- Add a generic OpenClaw core configuration engine.
- Add a public Plugin SDK configuration-provider contract.
- Define built-in default configurations for individual tools.
- Implement Windows Node per-tool configuration in the first increment.
- Change non-`exec` tools to execute their work through MXC in the first
  increment.
- Define a cross-backend sandbox configuration format.
- Persist MXC ETL, raw denial logs, observations, or learning sessions.

## Proposal

### Ownership

The MXC plugin registers a low-priority `before_tool_call` hook. Ordinary hooks
can normalize or rewrite tool parameters first, then the MXC hook evaluates the
final argument object that would proceed to execution.

The MXC plugin owns:

- Argument canonicalization and hashing.
- Configuration lookup.
- Configuration audit events.
- Authorization metadata passed to MXC-backed execution.
- Composition of the selected tool configuration with the shared MXC baseline
  and resolved per-agent sandbox settings.
- Validation of MXC denial results before a configuration is retried or stored.
- CLI commands used to inspect and manage configurations.

OpenClaw core continues to own generic hook execution, agent sessions, tool
execution, approval presentation, and plugin state infrastructure. MXC owns
denial capture, decoding, de-duplication, output limits, and platform support.

### Configuration model

Each tool call resolves to one of two configuration states:

| Configuration state | Behavior |
|---|---|
| No matching configuration | Use the existing MXC baseline and resolved per-agent sandbox settings |
| Exact or wildcard configuration | Further restrict the existing configuration |

Configuration-store read or parse failures are different from a missing
configuration. A missing configuration is the compatibility case. A
configuration evaluation error blocks the call because OpenClaw cannot
determine the requested sandbox.

The proposed flow is:

```mermaid
flowchart TD
    A[Agent requests a tool call] --> B[Ordinary tool rewrite hooks]
    B --> C[MXC before_tool_call hook]
    C --> D[Canonicalize arguments and compute hash]
    D --> E[(OpenClaw SQLite configuration store)]
    E --> F{Exact or wildcard match?}

    F -->|No match| G[Use existing MXC baseline configuration]
    F -->|Match| H[Attach per-tool sandbox configuration]

    G --> I[Validate request and create MXC sandbox]
    H --> I
    I --> J{Sandbox created?}
    J -->|No| K[Fail tool call]
    J -->|Yes| L[Execute through MXC]
```

**Figure 1.** The MXC hook selects the sandbox configuration for the final tool
arguments. MXC-backed execution fails if the requested sandbox cannot be
created.

### Configuration matching

The configuration advisor canonicalizes the final tool arguments and computes
a stable SHA-256 hash.

Canonicalization follows these rules:

- Object keys are sorted recursively.
- Array order remains significant.
- Scalar values retain their type and value.

The advisor checks configurations in this order:

1. Exact tool name and canonical argument hash.
2. Wildcard configuration for the tool.
3. No match.

An exact configuration always takes precedence over a wildcard configuration.
A wildcard configuration uses the tool name with an empty argument hash and
applies to all argument sets for that tool. Configurations are shared across
agents but are composed with the invoking agent's resolved sandbox settings.

### Sandbox configuration fragment

A per-tool configuration stores the MXC fields that can vary by tool using the
same names, nesting, and units as MXC `ContainerConfig`:

The following is a TypeScript type declaration, not runtime code that reads or
extracts values from a `ContainerConfig`. `Pick` means the fragment accepts
only the listed fields from that nested MXC configuration section.
`NonNullable` lets TypeScript inspect an optional section before selecting its
fields. Referencing the MXC SDK types keeps this fragment aligned with the
upstream schema without redefining each field locally.

```ts
import type { ContainerConfig } from "@microsoft/mxc-sdk";

type MxcSandboxConfigurationFragment = {
  process?: Pick<NonNullable<ContainerConfig["process"]>, "timeout">;
  filesystem?: Pick<
    NonNullable<ContainerConfig["filesystem"]>,
    "deniedPaths" | "readonlyPaths" | "readwritePaths"
  >;
  network?: Pick<
    NonNullable<ContainerConfig["network"]>,
    | "defaultPolicy"
    | "enforcementMode"
    | "allowLocalNetwork"
    | "allowedHosts"
    | "blockedHosts"
    | "proxy"
  >;
  ui?: ContainerConfig["ui"];
  processContainer?: Pick<
    NonNullable<ContainerConfig["processContainer"]>,
    "capabilities" | "ui"
  >;
};
```

The entry stores the selector, creation source, and MXC schema version outside
the fragment. OpenClaw adds runtime-only fields when the tool executes:

- Command line, environment, and working directory.
- Container identity and containment selection.
- Lifecycle and cleanup settings.
- Denial-capture controls.

The fragment is not a complete runtime configuration and is not an additive
patch. It may only restrict the shared MXC baseline and any corresponding
per-agent sandbox setting:

- Filesystem access can be downgraded or denied but cannot add a path or
  stronger access.
- Network, UI, and ProcessContainer capabilities can only be narrowed.
- The shortest applicable timeout wins.
- Mandatory protected-resource restrictions cannot be overridden.

The per-agent and MXC schemas do not need to map one-to-one. OpenClaw applies a
per-agent restriction where a corresponding setting exists and otherwise keeps
the MXC baseline configuration. Invalid, widening, or unenforceable
combinations fail closed.

#### Adding new MXC fields

The fragment can expand as MXC adds configuration fields. Each new field is
added explicitly after OpenClaw defines how it composes with the baseline and
per-agent settings. The entry's MXC schema version supports validation and
migration of stored configurations. Unknown fields fail closed rather than
becoming available automatically.

### Enforcement boundary

For a matching configuration, the hook attaches versioned
`executionMetadata.mxcSandbox` containing:

- Authorized tool name.
- Canonical argument hash.
- Original `exec` command when applicable.
- Selected MXC sandbox configuration fragment.

The MXC backend validates this metadata before applying it. For `exec`, the
backend confirms that the command reaching sandbox execution is the command
authorized by the hook.

The backend builds the complete runtime `ContainerConfig` from the existing
configuration, selected fragment, and invocation fields. The complete
configuration is serialized for the MXC launcher; the fragment is not passed
as separate command-line switches.

Missing, malformed, mismatched, or widening authorization metadata blocks
configuration-governed MXC execution. This second validation prevents a
rewritten or substituted command from consuming configuration intended for
another call.

### Separate sandbox modes

This RFC defines the first implementation for Gateway-local execution through
the OpenClaw MXC plugin. Windows Node can adopt the same per-tool configuration
matching and Learning Mode workflow for commands it executes.

The two sandbox modes keep separate configuration state and enforcement.
Gateway-local configurations apply only to Gateway-local execution. Windows
Node configurations apply only to execution on that node. Neither mode reads,
composes with, or modifies the other's sandbox configurations.

This separation is required because the Gateway and Windows Node can run on
different devices with different filesystems, available capabilities, and
baseline configurations. A configuration approved for one execution
environment must not be treated as valid for the other.

### Sandbox creation failure

MXC may be unable to create a sandbox with the selected per-tool
configuration. When this occurs:

- The tool call fails.
- OpenClaw reports that the requested sandbox could not be created.
- OpenClaw does not retry the command without MXC containment.

### Initial enforcement scope

MXC-backed `exec` is the first supported tool because its command is launched
through the MXC backend. Tools that run inside the OpenClaw process or use
another execution backend do not create an MXC sandbox, so there is no MXC
sandbox configuration for them to apply.

If another tool is later changed to execute work through MXC, it can use the
same per-tool configuration matching and validation path.

Calls executed through Windows Node use a separate node-local configuration
path. Windows Node can implement the same matching and approval semantics
without consuming the Gateway-local configuration entries defined here.

### Learning Mode

The proposed integration will support MXC's two application-driven
`captureDenials` modes.

#### App / user-configurable: block mode

`captureDenials.mode: "block"` is MXC's enforced, deny-and-record flow.
Containment remains enforced while denied access is recorded. After the process
exits, MXC will return a structured `DenialsDocument`; it will not return an
OpenClaw sandbox configuration.

OpenClaw will validate that the result is complete and that each requested
change is representable, does not expose a protected resource, and remains
within the shared MXC baseline and resolved per-agent sandbox settings. It will
then present:

- **Deny:** do not rerun.
- **Allow once:** rerun with an ephemeral exact configuration change.
- **Always allow:** store the validated change for the exact configuration and
  rerun.

The sandboxed tool process that produced the denial has already exited.
Approval cannot resume that process or retroactively allow its denied
operation; OpenClaw starts a new tool execution. A denial that requires
changing the shared baseline or per-agent settings is reported as a baseline
configuration change instead of a per-tool change. OpenClaw will not persist
the denial document, ETL, raw events, or a separate learning session.

OpenClaw's current MXC Node SDK dependency does not expose the complete typed
capture contract. Implementation requires typed `captureDenials` input,
structured output metadata, a runtime support result, and a reliable
completeness signal. Missing support, capture failure, or truncated output
fails closed.

OpenClaw must not remove an existing baseline protection to make capture start.
If MXC cannot combine capture with the effective configuration on the current
host, Learning Mode is unavailable for that call.

#### Fleet auditing: allow mode

`captureDenials.mode: "allow"` is MXC's relaxed, allow-all capture flow. Access
checks that the sandbox would normally deny are allowed and recorded for the
run. OpenClaw must present this as a reduced-containment auditing mode and
require the user to start it explicitly.

After the run, OpenClaw can use the structured records to propose a sandbox
configuration for review. The proposed configuration must pass the same
protected-resource, baseline, per-agent, completeness, and representability
validation before it can be stored. The observed access never becomes active
configuration automatically.

Windows Node can adopt either capture flow when it exposes node-local denial
capture. Its learned configurations remain local to that node's sandbox
settings and filesystem.

### Configuration storage

Configurations are mutable OpenClaw runtime state and are stored in the shared
OpenClaw state database:

```text
state/openclaw.sqlite
```

The MXC plugin uses the plugin-state API with a dedicated
`sandbox-configurations` namespace. Each entry records:

- Tool name.
- Exact argument hash or wildcard marker.
- Value-free argument-shape summary.
- MXC schema version.
- MXC sandbox configuration fragment.
- Usage count.
- Creation and last-used timestamps.
- Creation source, including `cli`, `imported`, or `learned`.

The initial design does not impose an application-level configuration count
limit. Unmatched calls do not create configuration entries, so store growth is
driven by user-created, imported, and learned entries. Users manage per-tool
sandbox configurations through supported CLI commands rather than editing
SQLite directly.

MXC containment must not grant sandboxed tool processes write access to the
OpenClaw state directory containing `openclaw.sqlite`. OpenClaw and trusted
plugin code retain runtime access for configuration and usage updates.

### Configuration management

The MXC plugin provides:

```text
openclaw mxc sandbox list
openclaw mxc sandbox show <toolName>
openclaw mxc sandbox edit <toolName>
openclaw mxc sandbox remove <toolName>
```

The CLI must support exact and wildcard configurations without requiring
direct database access. The approval surface uses the same validation and
persistence path.

### Configuration

The proposed plugin configuration is owned by `plugins.entries.mxc.config`:

| Field | Default | Purpose |
|---|---:|---|
| `perToolSandboxEnabled` | `true` | Select per-tool MXC sandbox configurations |
| `auditLogPath` | State log directory | Override the JSONL audit path |

MXC-backed execution continues to require the MXC sandbox backend:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",
        "backend": "mxc"
      }
    }
  }
}
```

### Audit

The default audit path is:

```text
<state-dir>/logs/mxc-sandbox.jsonl
```

Audit events include:

- Event type.
- Tool name.
- Argument hash.
- Configuration match source.
- Session, run, tool-call, and request identifiers.
- Requested access summary.
- Sandbox creation result.
- Learning decision and rerun result.
- Duration and success state.

Audit events do not include raw tool arguments, command text, secrets, error
text, denial documents, or ETL. Audit writes are serialized and best-effort so
an audit failure does not report a false tool execution failure.

### Security and correctness invariants

1. Configuration lookup occurs before tool execution.
2. No matching configuration uses the shared MXC baseline and resolved
   per-agent sandbox settings without creating an entry.
3. Configuration-store read and parse errors block the call.
4. Exact configurations take precedence over wildcard configurations.
5. Per-tool configurations cannot widen the shared baseline or corresponding
   per-agent sandbox settings.
6. The execution adapter validates authorization metadata independently.
7. MXC-backed `exec` validates command correlation before launch.
8. Learning approval happens after the denied tool process exits and starts a
   new execution rather than resuming the original process.
9. `Allow once` is ephemeral; only `Always allow` changes persistent state.
10. Incomplete, protected, unrepresentable, or widening learning results cannot
    become per-tool configuration changes.
11. Allow-mode auditing requires explicit user initiation and never activates
    observed access automatically.
12. Gateway-local and Windows Node configurations remain separate; neither
    configuration store influences execution in the other sandbox mode.
13. Sandbox creation failure blocks execution and never triggers uncontained
    host fallback.
14. Sandboxed tool processes cannot write the SQLite entries that store
    per-tool sandbox configurations.
15. Audit events do not persist raw tool payloads, command text, secrets, error
    text, denial documents, or ETL.

## Rationale

### Store configurations in SQLite instead of JSON

| Option | Advantages | Disadvantages |
|---|---|---|
| SQLite through the OpenClaw plugin-state API | Uses OpenClaw's canonical runtime state store; supports atomic updates and concurrent access; makes matching and usage tracking straightforward | Requires CLI or UI management; export, backup, and migration behavior must be deliberate |
| JSON configuration file | Human-readable; easy to copy, diff, review, and hand-author | Requires locking and atomic-write handling; creates another state and migration surface; direct edits can race with runtime updates |

SQLite is preferred because these configurations are mutable runtime state.
User visibility and control come from supported CLI and export surfaces instead
of direct database editing.

### Keep configuration selection in the OpenClaw MXC plugin

Moving the configuration advisor into MXC itself would place OpenClaw tool
identity and application state in a lower-level containment component. A
separate package would add distribution and versioning complexity before
another consumer exists.

The OpenClaw MXC plugin is the narrowest owner that has access to both the
OpenClaw tool context and the MXC enforcement boundary.

### Do not add a generic core configuration engine

A generic configuration-provider framework would define a public cross-plugin
contract before requirements for other sandbox backends are understood. The
plugin-owned design can later inform a shared contract if a second backend
demonstrates the same need.

### Use exact and wildcard configurations

Exact configurations support argument-specific sandbox choices. Wildcard
configurations provide a manageable fallback for tools whose calls should
share one configuration. Exact-first matching allows a user to define a
specific exception without changing the broader wildcard configuration.

### Preserve compatibility for unmatched calls

Failing closed for every unmatched call could block existing installations as
soon as the feature is enabled.

An unmatched call therefore uses the existing shared MXC baseline and resolved
per-agent sandbox settings. Configuration read failures, authorization
mismatches, and sandbox creation failures still block the affected call.

### Treat denial records as configuration evidence

MXC reports the access that was denied. OpenClaw decides whether that evidence
can safely change a per-tool sandbox configuration. Every approved change is
validated against the existing baseline and per-agent settings before rerun or
persistence.

## Unresolved questions

- Which denial resource and access types can be converted safely into the
  stored MXC sandbox configuration fragment?
- Should approval operate on individual denials, a reviewed group, or both?
- How should repeated denials update an existing exact configuration?
- What information should OpenClaw show when MXC cannot create the requested
  sandbox or a denial requires a baseline configuration change?
