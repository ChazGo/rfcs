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
    managed: "Reduced-containment Windows posture",
    warning:
      "This removes the Agent User boundary and runs the Gateway with the signed-in user's native access. It requires an explicit human-side choice.",
  },
};

export const surfaces = {
  cli: {
    label: "Bootstrapper command line",
    badge: "Authoritative",
    title: "Manage Gateway isolation from the Windows host",
    copy:
      "clawctl runs outside the Agent User Session, so it can own isolation setup and lifecycle changes without giving the Gateway a write path.",
    example: `clawctl gateway-isolation status
clawctl gateway-isolation enable
clawctl gateway-isolation disable
clawctl gateway-isolation disable --force`,
    notes: [
      "Command spelling is proposed and still needs launcher-owner review.",
      "Enabled maps to Minimal. Disabled maps to YOLO.",
      "Disabling prompts because it removes the Agent User boundary.",
      "--force bypasses that prompt for explicit automation.",
      "Changing an existing installation is a host lifecycle operation, not openclaw config set.",
    ],
  },
  web: {
    label: "Gateway Web UI",
    badge: "Status and handoff",
    title: "Show posture without exposing a downgrade",
    copy:
      "The Web UI runs with the Gateway. It can display informational posture, but only a trusted Windows surface can verify or change the outer execution mode.",
    notes: [
      "Gateway-reported posture is informational, not security attestation.",
      "No Gateway path can request or trigger a write, including config RPC, agents, tools, skills, MCP, and plugins.",
      "YOLO may offer a handoff to enable Minimal. Minimal does not offer a Web UI path to enable YOLO.",
      "MXC plugin presets remain separate per-command controls.",
      "If Companion is unavailable in YOLO, offer clawctl gateway-isolation enable instead of a silent no-op.",
    ],
    examples: {
      minimal: `Reported mode: Minimal
Authoritative status: Windows Companion

[Open Windows Companion status]`,
      yolo: `Reported mode: YOLO
Authoritative status: Windows Companion

[Enable Gateway isolation in Windows Companion]
[Copy: clawctl gateway-isolation enable]`,
    },
  },
  companion: {
    label: "Windows Companion",
    badge: "Primary graphical owner",
    title: "Manage the local Gateway from the human session",
    copy:
      "The Companion app is the preferred graphical surface because it runs in the signed-in user session and can call the launcher-owned management contract.",
    example: `Gateway isolation

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
