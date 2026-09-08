export const modes = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    recommendation: "Recommended managed path",
    summary: "Run the Gateway in a dedicated Agent User Session.",
    execution: "Agent User Session",
    identity: "Separate Agent User identity",
    network: "Available; not constrained by this mode",
    files: "Only locations available to the Agent User",
    processContainment: "None in the first step",
    managed: "Managed Windows path",
    warning:
      "The outer session remains mandatory. If session creation fails, launch fails instead of falling back to the human identity.",
  },
  yolo: {
    id: "yolo",
    name: "YOLO",
    recommendation: "Advanced, reduced-containment path",
    summary: "Run the Gateway natively as the signed-in user.",
    execution: "Native host process",
    identity: "Signed-in user identity",
    network: "Native process behavior",
    files: "Native user access",
    processContainment: "None",
    managed: "Separate unmanaged posture",
    warning:
      "This removes the Agent User boundary. It conflicts with the managed Windows Golden Path unless product requirements explicitly allow a separate native path.",
  },
};

export const surfaces = {
  cli: {
    label: "Bootstrapper command line",
    badge: "Authoritative",
    title: "Choose the mode before the Gateway starts",
    copy:
      "The bootstrapper runs outside the Agent User Session, so it can own setup and lifecycle changes without giving the Gateway a write path.",
    example: `clawctl setup --execution-mode minimal
clawctl setup --execution-mode yolo`,
    notes: [
      "Command spelling is proposed and still needs launcher-owner review.",
      "Minimal is the default path.",
      "YOLO requires an explicit advanced choice and reduced-containment warning.",
      "Changing an existing installation is a host lifecycle operation, not openclaw config set.",
    ],
  },
  web: {
    label: "Gateway Web UI",
    badge: "Status and handoff",
    title: "Show posture, but do not own it",
    copy:
      "The Web UI runs with the Gateway. It can display informational posture and direct the human to a trusted host surface, but only the host can verify or rewrite the outer execution mode.",
    example: `Reported mode: Minimal
Authoritative status: Windows Companion

[Open Windows Companion settings]
[Copy clawctl command]`,
    notes: [
      "Gateway-reported posture is informational, not security attestation.",
      "No Gateway path can request or trigger a write, including config RPC, agents, tools, skills, MCP, and plugins.",
      "MXC plugin presets remain separate per-command controls.",
      "If Companion is unavailable, show a copyable host command instead of a silent no-op.",
    ],
  },
  companion: {
    label: "Windows Companion",
    badge: "Primary graphical owner",
    title: "Manage the local Gateway from the human session",
    copy:
      "The Companion app is the preferred graphical surface because it runs in the signed-in user session and can call the launcher-owned management contract.",
    example: `Local Gateway execution

(*) Minimal - Recommended
    Run in a dedicated Agent User Session

( ) YOLO - Advanced
    Run natively with your Windows access

[Apply and restart Gateway]`,
    notes: [
      "Show the current mode and whether enterprise policy locks it.",
      "A change requires a visible restart or reprovision step.",
      "The app calls the host launcher. It does not edit files in the Agent User profile.",
    ],
  },
};

export const publicSources = [
  {
    label: "Gateway Containment and Windows Isolation Sessions",
    url: "https://github.com/openclaw/rfcs/blob/ae9f4a2ed27468a4a6a86edfa183674ccf4d63c0/rfcs/0032-gateway-containment-windows-isolation-session.md",
    revision: "RFC 0032 proposal at ae9f4a2",
  },
  {
    label: "MXC Per-Tool Sandbox Configuration",
    url: "https://github.com/ChazGo/rfcs/blob/9310748ab521a66b8ae799600f6ed848ea8c4675/rfcs/0026-mxc-per-tool-policy-advisor.md",
    revision: "RFC 0026 proposal at 9310748",
  },
  {
    label: "Immutable packaged OpenClaw payload investigation",
    url: "https://github.com/openclaw/openclaw-windows-packaging/issues/10",
    revision: "Open architecture investigation",
  },
  {
    label: "Current Gateway MXC preset source",
    url: "https://github.com/ChazGo/openclaw/blob/533ad8dbb69cf8196f07b30fdf31c4f3e0c04961/extensions/mxc/src/security-level.ts",
    revision: "Working branch at 533ad8d",
  },
  {
    label: "Current Windows node Sandbox page",
    url: "https://github.com/openclaw/openclaw-windows-node/blob/a76c85218c7d6b82f2fa7234ee7e9c11848a3f0d/src/OpenClaw.Tray.WinUI/Pages/SandboxPage.xaml",
    revision: "Main at a76c852",
  },
];
