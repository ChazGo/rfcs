export const modes = {
  enabled: {
    id: "enabled",
    name: "Enabled",
    recommendation: "Recommended",
    summary: "Run the Gateway in a dedicated Agent User Session.",
    execution: "Agent User Session",
    identity: "Separate Agent User identity",
    network: "Available; not constrained by this mode",
    files: "Only locations available to the Agent User",
    processContainment: "None in the first step",
    managed: "Gateway isolation on",
    warning:
      "The outer session remains mandatory. If session creation fails, launch fails instead of falling back to the human identity.",
  },
  disabled: {
    id: "disabled",
    name: "Disabled",
    recommendation: "Advanced, reduced containment",
    summary: "Run the Gateway natively as the signed-in user.",
    execution: "Native host process",
    identity: "Signed-in user identity",
    network: "Native process behavior",
    files: "Native user access",
    processContainment: "None",
    managed: "Gateway isolation off",
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
      "Disabling prompts because it removes the Agent User boundary.",
      "--force bypasses that prompt for explicit automation.",
      "Changing an existing installation is a host lifecycle operation, not openclaw config set.",
    ],
  },
  web: {
    label: "Control UI",
    badge: "Status and safe upgrade",
    title: "Enable isolation without exposing a downgrade",
    copy:
      "When isolation is disabled, the Control UI runs as the signed-in user and can invoke the host-owned enable command. Once isolation is enabled, the Agent User cannot invoke the host-owned disable command.",
    notes: [
      "Gateway-reported posture is informational, not security attestation.",
      "Disabled can invoke clawctl gateway-isolation enable and restart inside the Agent User Session.",
      "Enabled exposes status only. It does not offer or authorize gateway-isolation disable.",
      "The host launcher validates and applies the transition; the setting is not stored in openclaw.json.",
      "MXC plugin presets remain separate per-command controls.",
    ],
    examples: {
      enabled: `Reported Gateway isolation: Enabled
Authoritative status: Windows host

[View isolation details]`,
      disabled: `Reported Gateway isolation: Disabled
Authoritative status: Windows host

[Enable Gateway isolation]`,
    },
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
