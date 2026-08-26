const gatewayRevision = "b0e8a985ee11ac94aa76513f4da6b5693334c409";
const windowsNodeRevision = "a76c85218c7d6b82f2fa7234ee7e9c11848a3f0d";
const mxcRevision = "b336f54dec3b";
const gatewayRfcRevision = "ae9f4a2ed27468a4a6a86edfa183674ccf4d63c0";

const current = { kind: "current", label: "Current public source" };
const proposed = { kind: "proposed", label: "Proposed in RFC 0032" };
const openDecision = { kind: "open", label: "Open decision" };

const windowsNodeSources = [
  {
    label: "Windows-node MXC settings defaults",
    url: `https://github.com/openclaw/openclaw-windows-node/blob/${windowsNodeRevision}/src/OpenClaw.Shared/SettingsData.cs#L161-L220`,
    revision: `openclaw-windows-node @ ${windowsNodeRevision.slice(0, 12)}`,
  },
  {
    label: "Windows-node ProcessContainer mapping",
    url: `https://github.com/openclaw/openclaw-windows-node/blob/${windowsNodeRevision}/src/OpenClaw.Shared/Mxc/MxcConfigBuilder.cs#L120-L216`,
    revision: `openclaw-windows-node @ ${windowsNodeRevision.slice(0, 12)}`,
  },
  {
    label: "Windows-node fallback behavior",
    url: `https://github.com/openclaw/openclaw-windows-node/blob/${windowsNodeRevision}/src/OpenClaw.Shared/Mxc/MxcCommandRunner.cs#L109-L139`,
    revision: `openclaw-windows-node @ ${windowsNodeRevision.slice(0, 12)}`,
  },
];

const nodeSettingsSchema = `type WindowsNodeSystemRunSandbox = {
  systemRunSandboxEnabled: boolean;
  systemRunBlockHostFallbackWhenMxcUnavailable: boolean;
  systemRunAllowOutbound: boolean;
  systemRunAllowWindowsUi: boolean;
  sandboxClipboard: "None" | "Read" | "Write" | "ReadWrite";
  sandboxTimeoutMs: number;
  sandboxMaxOutputBytes: number;
  sandboxCustomFolders?: FolderGrant[];
};`;

const nodeSettingsExample = `{
  "systemRunSandboxEnabled": true,
  "systemRunBlockHostFallbackWhenMxcUnavailable": false,
  "systemRunAllowOutbound": false,
  "systemRunAllowWindowsUi": false,
  "sandboxClipboard": "None",
  "sandboxTimeoutMs": 30000,
  "sandboxMaxOutputBytes": 4194304
}`;

const nodeContainerExample = `{
  "version": "0.7.0-alpha",
  "containerId": "<per-run id>",
  "process": {
    "commandLine": "cmd.exe /d /s /c ...",
    "cwd": "<request cwd or writable scratch>",
    "env": [],
    "timeout": 30000
  },
  "processContainer": {
    "leastPrivilege": false,
    "capabilities": [],
    "ui": { "isolation": "container" }
  },
  "filesystem": {
    "readonlyPaths": [
      "<explicit folder grants>",
      "<backend-safe PATH directories>"
    ],
    "readwritePaths": ["<per-run scratch>"]
  },
  "network": {
    "defaultPolicy": "block",
    "enforcementMode": "capabilities"
  },
  "ui": {
    "disable": true,
    "clipboard": "none",
    "injection": false
  },
  "lifecycle": {
    "destroyOnExit": true,
    "preservePolicy": false
  }
}`;

const gatewayProcessControls = [
  {
    label: "Network",
    value: "Blocked",
    detail:
      "No internet or local-network capability is granted. The plugin's explicit network: default option adds outbound internet access, but local network access remains blocked.",
  },
  {
    label: "Files and folders",
    value: "Project read-only, temp writable",
    detail:
      "The project and required system paths are read-only by default. Protected skill sources are mounted read-only when present. A sandbox temp directory is writable; additional read-only and read-write path lists start empty.",
  },
  {
    label: "Clipboard",
    value: "Blocked",
    detail:
      "The generated MXC configuration sets clipboard to none, so the contained process cannot read from or write to the caller's clipboard.",
  },
  {
    label: "UI",
    value: "Disabled",
    detail:
      "Win32 UI access and input injection are disabled. ProcessContainer handle and atom isolation remain at the restrictive container setting.",
  },
];

const nodeProcessControls = [
  {
    label: "Network",
    value: "Blocked",
    detail:
      "Outbound network is disabled and no internet capability is granted. The node operator can explicitly enable outbound access.",
  },
  {
    label: "Files and folders",
    value: "CWD read-only, scratch writable",
    detail:
      "Documents, Downloads, Desktop, and custom-folder settings add no grants by default. A requested working directory is implicitly granted read-only unless denied; backend-safe PATH directories are read-only, and per-run scratch is writable.",
  },
  {
    label: "Clipboard",
    value: "Blocked",
    detail:
      "The default clipboard mode is None. Read, write, or read-write access requires an explicit node setting.",
  },
  {
    label: "UI",
    value: "Disabled",
    detail:
      "Win32 UI access and input injection are blocked, with ProcessContainer isolation set to container. The node operator can explicitly allow Windows UI.",
  },
];

function withControlState(controls, state) {
  return controls.map((control) => ({ ...control, state }));
}

const agentSessionSchema = `type IsolationSessionProvisionConfig = {
  version?: string; // defaults to SDK-supported version
  network: {
    defaultPolicy: "allow";
    allowLocalNetwork: true;
  };
  appId?: string; // packaged callers use PFN:<family-name>
};

type IsolationSessionProvisionResult = {
  sandboxId: SandboxId<"isolation_session">;
  metadata?: {
    agentUserName: string;
    agentUserSid: string;
    ephemeralWorkspacePath: string;
  };
};`;

const agentSessionExample = `import {
  provisionSandbox,
  startSandbox,
  execInSandboxAsync,
  stopSandbox,
  deprovisionSandbox
} from "@microsoft/mxc-sdk";

const options = { experimental: true };
const { sandboxId, metadata } = await provisionSandbox(
  "isolation_session",
  {
    network: {
      defaultPolicy: "allow",
      allowLocalNetwork: true
    }
  },
  options
);

await startSandbox(sandboxId, {}, options);
await execInSandboxAsync(
  sandboxId,
  {
    process: {
      commandLine: "<Gateway command>"
    }
  },
  options
);

await stopSandbox(sandboxId, undefined, options);
await deprovisionSandbox(sandboxId, undefined, options);

console.log(metadata?.agentUserName);`;

const agentSessionSources = [
  {
    label: "MXC state-aware Isolation Session TypeScript API",
    url: `https://github.com/microsoft/mxc/blob/${mxcRevision}/docs/isolation-session/state-aware-typescript.md#L42-L107`,
    revision: `microsoft/mxc @ ${mxcRevision.slice(0, 12)}`,
  },
  {
    label: "MXC Isolation Session policy enforcement",
    url: `https://github.com/microsoft/mxc/blob/${mxcRevision}/src/backends/isolation_session/common/src/policy.rs#L5-L133`,
    revision: `microsoft/mxc @ ${mxcRevision.slice(0, 12)}`,
  },
  {
    label: "MXC Agent User and workspace lifecycle",
    url: `https://github.com/microsoft/mxc/blob/${mxcRevision}/src/backends/isolation_session/common/src/manager.rs#L44-L198`,
    revision: `microsoft/mxc @ ${mxcRevision.slice(0, 12)}`,
  },
  {
    label: "MXC Isolation Session process I/O",
    url: `https://github.com/microsoft/mxc/blob/${mxcRevision}/src/backends/isolation_session/common/src/process_options.rs#L15-L31`,
    revision: `microsoft/mxc @ ${mxcRevision.slice(0, 12)}`,
  },
  {
    label: "RFC 0032 proposed launcher and Agent User boundary",
    url: `https://github.com/openclaw/rfcs/blob/${gatewayRfcRevision}/rfcs/0032-gateway-containment-windows-isolation-session.md#L204-L280`,
    revision: `openclaw/rfcs @ ${gatewayRfcRevision.slice(0, 12)}`,
  },
  {
    label: "RFC 0032 opt-in and migration posture",
    url: `https://github.com/openclaw/rfcs/blob/${gatewayRfcRevision}/rfcs/0032-gateway-containment-windows-isolation-session.md#L679-L693`,
    revision: `openclaw/rfcs @ ${gatewayRfcRevision.slice(0, 12)}`,
  },
];

const gatewaySources = [
  {
    label: "OpenClaw generic sandbox defaults",
    url: `https://github.com/openclaw/openclaw/blob/${gatewayRevision}/src/agents/sandbox/config.ts#L247-L261`,
    revision: `openclaw/openclaw @ ${gatewayRevision.slice(0, 12)}`,
  },
  {
    label: "MXC plugin configuration defaults",
    url: `https://github.com/openclaw/openclaw/blob/${gatewayRevision}/extensions/mxc/src/config.ts#L10-L89`,
    revision: `openclaw/openclaw @ ${gatewayRevision.slice(0, 12)}`,
  },
  {
    label: "Generated Gateway MXC ContainerConfig",
    url: `https://github.com/openclaw/openclaw/blob/${gatewayRevision}/extensions/mxc/src/mxc-container-config.ts#L95-L200`,
    revision: `openclaw/openclaw @ ${gatewayRevision.slice(0, 12)}`,
  },
  {
    label: "Built-in Gateway MXC baseline",
    url: `https://github.com/openclaw/openclaw/blob/${gatewayRevision}/extensions/mxc/src/sandbox-baseline.ts#L54-L105`,
    revision: `openclaw/openclaw @ ${gatewayRevision.slice(0, 12)}`,
  },
  {
    label: "Upstream MXC ContainerConfig TypeScript contract",
    url: `https://github.com/microsoft/mxc/blob/${mxcRevision}/sdk/node/src/types.ts#L362-L404`,
    revision: `microsoft/mxc @ ${mxcRevision.slice(0, 12)}`,
  },
];

const gatewayContainerSchema = `type GatewayMxcContainerConfig = {
  version: "0.7.0-alpha";
  containerId: string;
  containment: "process" | "processcontainer";
  lifecycle: { destroyOnExit: true };
  process: {
    commandLine: string;
    cwd: string;
    env: Record<string, string>;
    timeout: number; // milliseconds
  };
  filesystem: {
    readonlyPaths: string[];
    readwritePaths: string[];
    clearPolicyOnExit: true;
  };
  ui: {
    disable: true;
    clipboard: "none";
    injection: false;
  };
  network: {
    defaultPolicy: "block" | "allow";
    enforcementMode: "capabilities";
  };
  processContainer: {
    name: string;
    leastPrivilege: true;
    capabilities: string[];
    ui: {
      isolation: "container";
      desktopSystemControl: false;
      systemSettings: "none";
      ime: false;
    };
  };
};`;

const gatewayContainerExample = `{
  "version": "0.7.0-alpha",
  "containerId": "<per-run id>",
  "containment": "process",
  "lifecycle": { "destroyOnExit": true },
  "process": {
    "commandLine": "<per-run command>",
    "cwd": "<requested workdir>",
    "env": {
      "TEMP": "<sandbox temp>",
      "TMP": "<sandbox temp>"
    },
    "timeout": 300000
  },
  "filesystem": {
    "readonlyPaths": [
      "<workspace/system/protected paths>"
    ],
    "readwritePaths": [
      "<sandbox temp>"
    ],
    "clearPolicyOnExit": true
  },
  "ui": {
    "disable": true,
    "clipboard": "none",
    "injection": false
  },
  "network": {
    "defaultPolicy": "block",
    "enforcementMode": "capabilities"
  },
  "processContainer": {
    "name": "<runtime id>",
    "leastPrivilege": true,
    "capabilities": [],
    "ui": {
      "isolation": "container",
      "desktopSystemControl": false,
      "systemSettings": "none",
      "ime": false
    }
  }
}`;

export const boundaryDetails = {
  "current-gateway": {
    kicker: "Current execution host",
    title: "Gateway host",
    statuses: [current],
    summary:
      "The Gateway owns agent and session state and selects whether execution stays local or targets a paired node. A path in a prompt does not select a node.",
    facts: [
      { label: "Execution principal", value: "Gateway process account" },
      { label: "Path namespace", value: "Gateway host filesystem" },
      { label: "Policy owner", value: "Gateway configuration" },
      { label: "Node selection", value: "Explicit target or binding" },
    ],
    options: [
      "<strong>Local:</strong> execute through the selected Gateway sandbox backend.",
      "<strong>Node:</strong> route to a specifically selected paired node.",
    ],
    notes: [
      "<strong>No path inference:</strong> <code>Documents</code> does not cause OpenClaw to discover or select a node.",
      "<strong>No client-device inference:</strong> the browser or Control UI device does not implicitly become the execution host.",
    ],
    sources: [
      {
        label: "OpenClaw sandbox execution model",
        url: `https://github.com/openclaw/openclaw/blob/${gatewayRevision}/docs/gateway/sandboxing.md#L25-L51`,
        revision: `openclaw/openclaw @ ${gatewayRevision.slice(0, 12)}`,
      },
      ...gatewaySources,
    ],
  },

  "current-gateway-mxc": {
    kicker: "Current, opt-in Gateway backend",
    title: "Gateway MXC ProcessContainer",
    statuses: [current],
    summary:
      "The public MXC plugin creates a fresh Windows ProcessContainer for each Gateway-local sandboxed command. Its policy is built for the Gateway host and is not reused on a Windows node.",
    facts: [
      { label: "Execution principal", value: "Restricted Gateway caller token" },
      { label: "Container lifetime", value: "One command" },
      { label: "Default network", value: "Blocked" },
      { label: "Effective timeout", value: "300 seconds" },
    ],
    controlIntro:
      "Effective defaults for a Gateway-local command when the MXC plugin is enabled. These values come from the plugin's generated ProcessContainer configuration, not from the proposed per-tool RFC.",
    controls: withControlState(gatewayProcessControls, "Current plugin default"),
    schema: gatewayContainerSchema,
    example: gatewayContainerExample,
    options: [
      "<strong>Containment:</strong> <code>processcontainer</code> is accepted; both values currently resolve to Windows ProcessContainer.",
      "<strong>Network:</strong> <code>default</code> adds the <code>internetClient</code> capability.",
      "<strong>Workspace:</strong> OpenClaw separately selects <code>none</code>, <code>ro</code>, or <code>rw</code> workspace access.",
      "<strong>Timeout:</strong> an explicitly configured value from 1 to 2,147,000 seconds is capped by the baseline timeout.",
      "<strong>Policy files:</strong> <code>mxcPolicyPaths</code> may add absolute policy files; an empty array requests baseline-only behavior.",
    ],
    notes: [
      "<strong>Opt-in:</strong> installing the plugin does not change OpenClaw's generic <code>sandbox.mode: \"off\"</code> default.",
      "<strong>Host-specific:</strong> paths resolve against the Gateway host identity before MXC restricts them.",
      "<strong>Two timeout defaults:</strong> the plugin resolver carries 120 seconds, but unless the user explicitly configures it, the generated runtime timeout comes from the 300-second baseline.",
      "<strong>Version boundary:</strong> OpenClaw currently generates <code>0.7.0-alpha</code> requests while current upstream MXC stable schema is <code>0.8.0-alpha</code>.",
    ],
    sources: gatewaySources,
  },

  "current-windows-node": {
    kicker: "Current signed-in user boundary",
    title: "Windows node",
    statuses: [current],
    summary:
      "The Windows node is a separate execution and authorization host. Its local settings decide whether system.run uses MXC and what the resulting process may access.",
    facts: [
      { label: "Execution principal", value: "Account running the Windows node" },
      { label: "Path namespace", value: "Windows-node host filesystem" },
      { label: "Policy owner", value: "Node-local settings" },
      { label: "Default profile grants", value: "Documents/Downloads/Desktop blocked" },
    ],
    schema: nodeSettingsSchema,
    example: nodeSettingsExample,
    options: [
      "<strong>Strict fallback:</strong> set <code>systemRunBlockHostFallbackWhenMxcUnavailable</code> to deny instead of running uncontained.",
      "<strong>Folder grants:</strong> Documents, Downloads, Desktop, and custom folders can be granted read-only or read-write.",
      "<strong>UI and network:</strong> both are blocked by default and can be enabled independently.",
    ],
    notes: [
      "<strong>Documents:</strong> resolves for the account running the Windows node, not the Gateway or Agent User.",
      "<strong>Resolution is not permission:</strong> the default node policy does not grant Documents access.",
      "<strong>Separate authority:</strong> Gateway approval cannot replace the node's local execution decision.",
    ],
    sources: windowsNodeSources,
  },

  "current-node-mxc": {
    kicker: "Current node-local containment",
    title: "Windows-node MXC ProcessContainer",
    statuses: [current],
    summary:
      "The Windows node maps its local sandbox settings into an MXC ProcessContainer configuration for one system.run command.",
    facts: [
      { label: "Execution principal", value: "Restricted Windows-node caller token" },
      { label: "Container lifetime", value: "One command" },
      { label: "Default timeout", value: "30 seconds" },
      { label: "Default output limit", value: "4 MiB" },
    ],
    controlIntro:
      "Effective defaults when the Windows node successfully launches MXC. If MXC is unavailable, the node currently falls back to uncontained host execution unless strict fallback blocking is enabled.",
    controls: withControlState(nodeProcessControls, "Current node default"),
    schema: nodeSettingsSchema,
    example: nodeContainerExample,
    options: [
      "<strong>Outbound network:</strong> adds <code>internetClient</code> and changes the network default to allow.",
      "<strong>Windows UI:</strong> changes UI isolation from container to desktop and permits PowerShell shells.",
      "<strong>Clipboard:</strong> supports None, Read, Write, or ReadWrite modes.",
      "<strong>Folders:</strong> explicit grants may be read-only or read-write; omitted paths remain denied.",
    ],
    notes: [
      "<strong>No separate identity:</strong> AppContainer restricts the caller token; it does not create an Agent User.",
      "<strong>Backend limitation:</strong> logical sensitive-path denials are not emitted as <code>deniedPaths</code> because this MXC backend rejects that field.",
    ],
    sources: windowsNodeSources,
  },

  "target-user-session": {
    kicker: "Target host boundary",
    title: "Signed-in user session",
    statuses: [current, proposed],
    summary:
      "The signed-in user's files and interactive Windows node remain in the user session. The proposed Gateway moves to a different Agent User identity.",
    facts: [
      { label: "Contains", value: "Operator UI and Windows node" },
      { label: "Documents path", value: "Signed-in user's Documents" },
      { label: "Gateway present", value: "No, in target architecture" },
      { label: "Cross-boundary access", value: "Explicit node or mediated transfer" },
    ],
    notes: [
      "<strong>No silent projection:</strong> user-profile paths are not automatically mapped into the Agent User session.",
      "<strong>Explicit target:</strong> a request must bind to this Windows node before user-session paths are resolved.",
    ],
    sources: agentSessionSources,
  },

  "target-operator": {
    kicker: "Target consent surface",
    title: "Operator client",
    statuses: [proposed, openDecision],
    summary:
      "An authenticated operator client is the recommended place to present Gateway-local sandbox-expansion requests when the Gateway runs without an interactive Agent User desktop.",
    facts: [
      { label: "Execution authority", value: "None by itself" },
      { label: "Suggested role", value: "Present typed approval requests" },
      { label: "Device inference", value: "Not automatic" },
      { label: "Open decision", value: "Final consent UX and routing" },
    ],
    notes: [
      "<strong>Command approval and sandbox expansion remain distinct:</strong> they may share transport and UI components without sharing authorization state.",
      "<strong>Client location is not execution context:</strong> opening a web UI on a device must not silently bind commands to that device.",
    ],
    sources: agentSessionSources,
  },

  "target-windows-node": {
    kicker: "Target node boundary",
    title: "Windows node",
    statuses: [current, proposed],
    summary:
      "The target architecture keeps the Windows node in the signed-in user's session. It remains the explicit route for accessing user-session files and retains node-local authorization.",
    facts: [
      { label: "Execution principal", value: "Signed-in user account" },
      { label: "Documents path", value: "Signed-in user's Documents" },
      { label: "Configuration owner", value: "Windows node" },
      { label: "Gateway relationship", value: "Explicit system.run target" },
    ],
    schema: nodeSettingsSchema,
    example: nodeSettingsExample,
    options: [
      "<strong>Request binding:</strong> a client or session may deliberately choose this node.",
      "<strong>Mediated file access:</strong> remains an alternative open design for workflows that need Gateway-local processing.",
    ],
    notes: [
      "<strong>No portable policy:</strong> the Gateway-local ProcessContainer configuration is not replayed on the node.",
      "<strong>Node-first recommendation:</strong> use the node for user-owned files rather than projecting the user's profile into the Agent User session.",
    ],
    sources: windowsNodeSources,
  },

  "target-node-mxc": {
    kicker: "Target nested node containment",
    title: "Node-local MXC ProcessContainer",
    statuses: [current, proposed],
    summary:
      "The node's ProcessContainer remains nested inside the signed-in user session. Its grants are evaluated in the node's filesystem and cannot exceed the node account's access.",
    facts: [
      { label: "Outer identity", value: "Signed-in user" },
      { label: "Inner policy owner", value: "Windows node" },
      { label: "Path canonicalization", value: "On the node" },
      { label: "Permission model", value: "Intersection with outer identity" },
    ],
    controlIntro:
      "The target architecture retains the current Windows-node ProcessContainer defaults. The nested placement is proposed; no separate target-policy default has been approved.",
    controls: withControlState(nodeProcessControls, "Current default; target nesting proposed"),
    schema: nodeSettingsSchema,
    example: nodeContainerExample,
    options: [
      "<strong>Current compatibility fallback:</strong> uncontained host execution remains the default if MXC is unavailable.",
      "<strong>Proposed strict per-call behavior:</strong> a sandbox-required request should fail closed rather than downgrade.",
    ],
    notes: [
      "<strong>Target-first:</strong> select the node, resolve paths on it, then evaluate local sandbox policy.",
      "<strong>Escape boundary:</strong> escaping this ProcessContainer reaches the signed-in user boundary, not the Agent User Gateway.",
    ],
    sources: windowsNodeSources,
  },

  "target-agent-session": {
    kicker: "Proposed outer Gateway boundary",
    title: "Agent User Isolation Session",
    statuses: [current, proposed, openDecision],
    summary:
      "MXC currently exposes an experimental state-aware Isolation Session API. RFC 0032 proposes using it through an external launcher to run the persistent Gateway as an OS-assigned Agent User.",
    facts: [
      { label: "Execution principal", value: "OS-assigned Agent User" },
      { label: "Current API maturity", value: "Experimental MXC backend" },
      { label: "Proposed default", value: "Off / explicit opt-in" },
      { label: "Proposed fallback", value: "Fail closed" },
    ],
    controlIntro:
      "Review focus: make the effective network, files, clipboard, and UI posture explicit. These are current MXC backend facts; OpenClaw's product defaults and configurable controls remain proposed or open.",
    controls: [
      {
        label: "Network",
        value: "Open",
        detail:
          "Outbound and local network access are unrestricted. MXC requires an explicit allow acknowledgment and cannot filter hosts, deny network, or enforce a proxy for this backend.",
        state: "Current, fixed by backend",
      },
      {
        label: "Files and folders",
        value: "Agent User ACLs",
        detail:
          "The session gets the Agent User's own profile and normal Windows ACL access, not the signed-in user's profile. MXC provides one shared ephemeral staging directory; host folder grants and denies are unsupported.",
        state: "Current, fixed by identity",
      },
      {
        label: "Clipboard",
        value: "Session-local clipboard works",
        detail:
          "The Agent User session has its own clipboard, isolated from the signed-in user's clipboard. MXC currently exposes no policy switch to disable it or redirect the host clipboard.",
        state: "Current, not configurable",
      },
      {
        label: "UI",
        value: "Enabled inside isolated session",
        detail:
          "Processes can create windows and use GDI in the Agent User session, while the session boundary isolates that UI from the signed-in user's desktop. MXC does not accept a UI restriction policy here.",
        state: "Current, not configurable",
      },
    ],
    schema: agentSessionSchema,
    example: agentSessionExample,
    options: [
      "<strong>Version:</strong> omitted values use the SDK-supported version.",
      "<strong>appId:</strong> optional; packaged callers use <code>PFN:&lt;package-family-name&gt;</code>.",
      "<strong>Lifecycle:</strong> provision, start, execute, stop, then deprovision.",
      "<strong>RFC persistence:</strong> RFC 0032 proposes retaining the Agent User profile across normal Gateway restarts.",
    ],
    notes: [
      "<strong>No RFC JSON schema:</strong> RFC 0032 places provider selection and fallback policy in the launcher, outside <code>openclaw.json</code>.",
      "<strong>Network acknowledgment:</strong> the current Isolation Session provision API requires unrestricted network values; it is not a network filtering policy.",
      "<strong>Staging only:</strong> <code>ephemeralWorkspacePath</code> is a caller-to-Agent-User staging directory and does not automatically become process CWD.",
      "<strong>Path identity:</strong> relative and profile paths resolve inside the Agent User session.",
      "<strong>Meeting correction:</strong> the Agent User clipboard is session-local, not disabled. This differs from the nested ProcessContainer default, where clipboard access is blocked.",
    ],
    sources: agentSessionSources,
  },

  "target-gateway": {
    kicker: "Proposed contained workload",
    title: "OpenClaw Gateway",
    statuses: [proposed],
    summary:
      "RFC 0032 proposes running the Gateway, plugins, scheduler, agent loop, and persistent state as the Agent User. The launcher establishes the boundary before the Gateway starts.",
    facts: [
      { label: "Execution principal", value: "Agent User" },
      { label: "Documents path", value: "Agent User's Documents" },
      { label: "Persistent state", value: "Agent User profile" },
      { label: "User-file route", value: "Explicit node or mediated transfer" },
    ],
    options: [
      "<strong>Local tool call:</strong> execute in a nested Gateway-local sandbox.",
      "<strong>Node command:</strong> explicitly route to the paired Windows node.",
    ],
    notes: [
      "<strong>Outer boundary first:</strong> the Gateway cannot establish or weaken its own Agent User containment.",
      "<strong>Profile migration:</strong> enabling containment requires moving Gateway state and re-establishing principal-bound secrets.",
    ],
    sources: agentSessionSources,
  },

  "target-gateway-mxc": {
    kicker: "Proposed nested Gateway containment",
    title: "Gateway-local MXC ProcessContainer",
    statuses: [current, proposed],
    summary:
      "The existing Gateway MXC backend is intended to nest inside the proposed Agent User session. Its per-tool policy can narrow Agent User access but cannot grant access held only by the signed-in user.",
    facts: [
      { label: "Outer identity", value: "Agent User" },
      { label: "Inner policy owner", value: "Gateway MXC plugin" },
      { label: "Documents path", value: "Agent User's Documents" },
      { label: "Permission model", value: "Intersection with outer identity" },
    ],
    controlIntro:
      "The proposed nested boundary starts from the current Gateway MXC defaults shown here. Whether OpenClaw changes those product defaults for the Agent User deployment remains open.",
    controls: withControlState(
      gatewayProcessControls,
      "Current inner default; Agent User nesting proposed",
    ),
    schema: `${gatewayContainerSchema}

// Restrictive per-tool fragment proposed by RFC 0026
type MxcSandboxConfigurationFragment = {
  process?: { timeout: number };
  filesystem?: {
    deniedPaths?: string[];
    readonlyPaths?: string[];
    readwritePaths?: string[];
  };
  network?: { defaultPolicy?: "allow" | "block" };
  ui?: object;
  processContainer?: { capabilities?: string[]; ui?: object };
};`,
    example: gatewayContainerExample,
    options: [
      "<strong>Per-tool refinement:</strong> RFC 0026 proposes exact and wildcard tool configurations that may only narrow the shared baseline.",
      "<strong>Learning Mode:</strong> proposed denial-driven approval may create an ephemeral or stored exact configuration before a fresh run.",
    ],
    notes: [
      "<strong>No access expansion:</strong> selecting signed-in-user Documents in this inner policy cannot make that path available to the Agent User.",
      "<strong>Compatibility proof required:</strong> Gateway-local MXC launch and path behavior must be tested from inside the Agent User session.",
    ],
    sources: [
      ...gatewaySources,
      {
        label: "RFC 0026 sandbox configuration fragment",
        url: "https://github.com/ChazGo/rfcs/blob/9310748ab521a66b8ae799600f6ed848ea8c4675/rfcs/0026-mxc-per-tool-policy-advisor.md#sandbox-configuration-fragment",
        revision: "ChazGo/rfcs @ 9310748ab521",
      },
      ...agentSessionSources,
    ],
  },
};
