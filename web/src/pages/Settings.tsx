import { ArrowUpRight, Monitor, Moon, Sun } from "lucide-react";
import { useBackendStatus } from "@/api";
import { PageContainer, PageHeader } from "@/components/layout";
import { Segmented } from "@/components/ui";
import { BackendPanel } from "@/components/settings/BackendPanel";
import { LocalData } from "@/components/settings/LocalData";
import { CommandLine, SettingRow, SettingsSection } from "@/components/settings/parts";
import { useTheme, type ThemePreference } from "@/lib/theme";

const DEFAULT_MODEL = "qwen2.5:7b-instruct";
const REPO_URL = "https://github.com/arshilkxwork/Hacktober-Fest";

function ThemeOption({ icon: Icon, label }: { icon: typeof Sun; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden strokeWidth={1.75} className="size-3.5" />
      {label}
    </span>
  );
}

export default function Settings() {
  const { preference, theme, setPreference } = useTheme();
  const { health } = useBackendStatus();
  const model = health?.model ?? DEFAULT_MODEL;

  const steps: { label: string; command: string; note?: string }[] = [
    { label: "Install DecisionTrail, from the repository root", command: 'pip install -e ".[dev]"' },
    { label: "Start Ollama", command: "ollama serve" },
    { label: "Pull the model, once", command: `ollama pull ${model}` },
    { label: "Start the API, which also serves the built web app", command: "decisiontrail serve", note: "Listens on http://127.0.0.1:8765." },
    { label: "For development, run the web app with hot reload", command: "cd web && npm run dev" },
  ];

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Appearance, the state of the local API and model, and what this browser keeps." />

      <SettingsSection title="Appearance" description="Saved in this browser.">
        <dl>
          <SettingRow
            label="Theme"
            hint={preference === "system" ? `Follows your system, which is ${theme} right now.` : `${theme === "dark" ? "Dark" : "Light"} on every visit.`}
          >
            <Segmented<ThemePreference>
              label="Theme"
              value={preference}
              onValueChange={setPreference}
              options={[
                { value: "dark", label: <ThemeOption icon={Moon} label="Dark" /> },
                { value: "light", label: <ThemeOption icon={Sun} label="Light" /> },
                { value: "system", label: <ThemeOption icon={Monitor} label="System" /> },
              ]}
            />
          </SettingRow>
        </dl>
      </SettingsSection>

      <SettingsSection
        title="Backend"
        description="The DecisionTrail API on this machine, and the Ollama model it uses to read discussions. Checked every 15 seconds."
      >
        <BackendPanel />
      </SettingsSection>

      <SettingsSection
        title="Run it locally"
        description="Everything runs on your machine. Run these in order the first time; afterwards only Ollama and the API need starting."
      >
        <ol className="flex flex-col gap-4 px-4 py-4">
          {steps.map((s, i) => (
            <li key={s.command} className="flex flex-col gap-1.5">
              <span className="text-sm text-fg">
                <span className="mr-2 tabular text-fg-muted">{i + 1}.</span>
                {s.label}
                {s.note ? <span className="ml-1.5 text-xs text-fg-muted">{s.note}</span> : null}
              </span>
              <CommandLine command={s.command} />
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-1.5 border-t border-line px-4 py-4">
          <span className="text-sm text-fg">
            Optional: a GitHub token, set before starting the API
            <span className="ml-1.5 text-xs text-fg-muted">Raises GitHub's rate limit when fetching pull requests and repositories.</span>
          </span>
          <CommandLine command="export GITHUB_TOKEN=<your token>" />
        </div>
      </SettingsSection>

      <SettingsSection title="Local data" description="Kept in this browser's storage only. Clearing it does not touch the decision store on the server.">
        <LocalData />
      </SettingsSection>

      <SettingsSection title="About" description="DecisionTrail, built for Hacktoberfest Hack Day by Team 404-Error.">
        <div className="px-4 py-4">
          <p className="max-w-prose text-sm text-fg text-pretty">
            DecisionTrail reads GitHub issues, pull requests and discuss.python.org threads, recovers the technical decisions made in them with
            quotes checked against the original posts, and links each decision to the code it is about.
          </p>
        </div>
        <dl className="divide-y divide-line border-t border-line">
          <SettingRow label="Model" align="start">
            <span className="text-pretty">
              <code className="font-mono text-xs">{model}</code>, an open-weight model run by Ollama on this machine. No cloud AI service is called.
            </span>
          </SettingRow>
          <SettingRow label="Version">
            <span className="font-mono text-xs tabular">{health?.version ?? "Unknown"}</span>
          </SettingRow>
          <SettingRow label="License">MIT</SettingRow>
          <SettingRow label="Source">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center gap-1 underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted"
            >
              arshilkxwork/Hacktober-Fest
              <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
              <span className="sr-only">(opens on GitHub in a new tab)</span>
            </a>
          </SettingRow>
        </dl>
      </SettingsSection>
    </PageContainer>
  );
}
