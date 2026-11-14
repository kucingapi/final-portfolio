"use client";

import { MessageCircle, Smartphone, Trash2 } from "lucide-react";
import type { ModelInfo } from "@/lib/dashboard/assistant-models";
import { shortName } from "@/lib/dashboard/assistant-models";
import type { SiteChatConfig, SiteChatSummary } from "@/lib/dashboard/sitechat";
import { useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { send, useApi } from "./api";
import { ModelSheet, costLabel, type Usage } from "./ModelSheet";
import { useDashboard } from "./data";
import { installApp, isIOS, isStandalone, onDisplayMode, onInstallable, canInstall } from "./device";
import { date } from "./format";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { toast } from "./ui/toaster";
import { type Prefs, useNotifications } from "./useNotifications";

export function SettingsView() {
  return (
    <div className="flex flex-col gap-10">
      <SiteChatSettings />
      <Notifications />
      <Install />
      <SignInSettings />
    </div>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {intro && <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

const Group = ({ children }: { children: React.ReactNode }) => (
  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{children}</div>
);

function Row({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5">
      <div className="min-w-0 flex-1 basis-56 text-sm leading-relaxed text-foreground">{children}</div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => <span className="mt-0.5 block text-muted-foreground">{children}</span>;

// --- Site chat ----------------------------------------------------------------------------------------

export type SiteChatData = { config: SiteChatConfig; ready: boolean; today: number; cap: number; chats: SiteChatSummary[] };
/** A visitor's message: the profile (about 15k tokens, much of it cached on Claude models) and a short answer. */
const MESSAGE: Usage = { label: "a message", input: 16_000, output: 300 };

function SiteChatSettings() {
  const data = useApi<SiteChatData>("/api/dashboard/sitechat");
  const models = useApi<{ models: ModelInfo[]; error?: string }>("/api/dashboard/assistant/models");
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const config = data.data?.config;
  const info = config && models.data?.models.find((m) => m.id === config.model);

  const save = async (patch: Partial<SiteChatConfig>) => {
    setBusy(true);
    try {
      await send("/api/dashboard/sitechat", "POST", patch);
      await data.reload();
      toast.success(patch.model ? `AI Novel now answers with ${shortName(patch.model, models.data?.models)}.` : patch.enabled ? "AI Novel is on the site." : "AI Novel is off.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Ask AI Novel"
      intro="A chat on every page of the site, where visitors ask an AI that answers as you, from your published CV, projects and testimonials. It says it's an AI, sends prices and dates to the contact page, and every chat lands in your Inbox."
    >
      {data.data && !data.data.ready && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm leading-relaxed text-foreground">
          It needs <code className="font-mono text-[0.8125rem]">OPENROUTER_API_KEY</code> in the environment before it shows on the site.
        </p>
      )}
      <Group>
        {!config ? (
          <Row>
            <Skeleton className="h-5 w-2/3" />
          </Row>
        ) : (
          <>
            <Row action={<Switch id="sitechat-on" checked={config.enabled} disabled={busy} onCheckedChange={(enabled) => save({ enabled })} />}>
              <label htmlFor="sitechat-on" className="font-medium">
                On the site
              </label>
              <Muted>The &ldquo;Ask AI Novel&rdquo; button in the corner of every page, in English and Bahasa.</Muted>
            </Row>
            <Row
              action={
                <Button size="sm" variant="secondary" onClick={() => setChoosing(true)} disabled={busy}>
                  Change
                </Button>
              }
            >
              <span className="font-medium">Model: {shortName(config.model, models.data?.models)}</span>
              <Muted>{info ? `${costLabel(info, MESSAGE)} from a visitor` : config.model}</Muted>
            </Row>
            <Row>
              <span className="font-medium">
                {data.data!.today} of {data.data!.cap} messages today
              </span>
              <Muted>Past the day&apos;s cap, the chat asks visitors to come back tomorrow or use the contact page. Each visitor also has an hourly limit.</Muted>
            </Row>
          </>
        )}
      </Group>
      {config && (
        <ModelSheet
          open={choosing}
          onOpenChange={setChoosing}
          use={MESSAGE}
          title="AI Novel's model"
          picker={{ model: config.model, onModel: (model) => save({ model }), models: models.data?.models, modelsError: models.data?.error ?? models.error }}
        />
      )}
      <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
        <MessageCircle className="size-4" />
        Visitors&apos; chats are in the Inbox, under Site chats.
      </p>
    </Section>
  );
}

// --- Notifications ------------------------------------------------------------------------------------

const KINDS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "enquiries", label: "Messages and site chats", hint: "Someone sent the contact form, or started a chat with AI Novel." },
  { key: "clicks", label: "Short-link clicks", hint: "Someone opened a /go/ link." },
  { key: "opens", label: "Tailored CV links opened", hint: "Someone opened a ?v= link." },
  { key: "downloads", label: "CV, portfolio and rate card downloads", hint: "From a tailored link." },
];

function Notifications() {
  const n = useNotifications();
  return (
    <Section title="Notifications" intro="A ping on your phone or computer when someone sends the contact form or opens one of your links. One per link a minute at most.">
      <Group>{n.support === null || n.loading ? <Row><Skeleton className="h-5 w-2/3" /></Row> : <ThisDevice n={n} />}</Group>

      {n.prefs && (
        <Group>
          {KINDS.map((k) => (
            <Row
              key={k.key}
              action={
                <Switch
                  id={`pref-${k.key}`}
                  checked={n.prefs![k.key]}
                  onCheckedChange={(value) => n.setPref(k.key, value)}
                  aria-describedby={`pref-${k.key}-hint`}
                />
              }
            >
              <label htmlFor={`pref-${k.key}`} className="font-medium">
                {k.label}
              </label>
              <Muted>
                <span id={`pref-${k.key}-hint`}>{k.hint}</span>
              </Muted>
            </Row>
          ))}
        </Group>
      )}

      {n.devices.length > 0 && (
        <Group>
          {n.devices.map((d) => (
            <Row
              key={d.id}
              action={
                <Button variant="ghost" size="icon-sm" onClick={() => n.disable(d.id)} disabled={n.busy} aria-label={`Stop pinging ${d.name}`}>
                  <Trash2 />
                </Button>
              }
            >
              <span className="flex items-center gap-2 font-medium">
                <Smartphone className="size-4 text-muted-foreground" />
                {d.name}
                {d.id === n.mine && <span className="font-normal text-muted-foreground">(this one)</span>}
              </span>
              <Muted>Added {date(d.createdAt)}</Muted>
            </Row>
          ))}
        </Group>
      )}
    </Section>
  );
}

function ThisDevice({ n }: { n: ReturnType<typeof useNotifications> }) {
  if (n.support === "install") {
    return (
      <Row>
        Not on this iPhone yet.
        <Muted>Notifications need the dashboard on your Home Screen. In Safari, tap Share, then Add to Home Screen, and open it from there.</Muted>
      </Row>
    );
  }
  if (n.support === "unsupported") {
    return (
      <Row>
        This browser can&apos;t get notifications.
        <Muted>Use Chrome, Edge, Firefox or Safari, or the dashboard on your phone&apos;s Home Screen.</Muted>
      </Row>
    );
  }
  if (n.permission === "denied") {
    return (
      <Row>
        Blocked on this device.
        <Muted>Allow notifications for this site in the browser&apos;s or phone&apos;s settings, then come back here.</Muted>
      </Row>
    );
  }
  if (n.on) {
    return (
      <Row
        action={
          <>
            <Button size="sm" variant="secondary" onClick={n.test} disabled={n.busy}>
              Send a test
            </Button>
            <Button size="sm" variant="ghost" onClick={() => n.disable()} disabled={n.busy}>
              Turn off
            </Button>
          </>
        }
      >
        <span className="font-medium">On for this device</span>
      </Row>
    );
  }
  return (
    <Row
      action={
        <Button size="sm" onClick={n.enable} disabled={n.busy}>
          {n.busy ? "Turning on…" : "Turn on"}
        </Button>
      }
    >
      <span className="font-medium">Off for this device</span>
    </Row>
  );
}

// --- Install ------------------------------------------------------------------------------------------

const never = () => () => {};

function Install() {
  const installed = useSyncExternalStore(onDisplayMode, isStandalone, () => false);
  const installable = useSyncExternalStore(onInstallable, canInstall, () => false);
  const ios = useSyncExternalStore(never, isIOS, () => false);
  return (
    <Section title="App">
      <Group>
        {installed ? (
          <Row>
            <span className="font-medium">Installed</span>
            <Muted>You&apos;re using the dashboard as an app on this device.</Muted>
          </Row>
        ) : installable ? (
          <Row action={<Button size="sm" onClick={installApp}>Install</Button>}>
            Install the dashboard as an app, with its own icon.
          </Row>
        ) : ios ? (
          <Row>
            Put the dashboard on your Home Screen.
            <Muted>In Safari, tap Share, then Add to Home Screen. It opens as its own app and can get notifications.</Muted>
          </Row>
        ) : (
          <Row>
            Install the dashboard as an app.
            <Muted>In Chrome or Edge, use Install in the address bar or the menu. On a phone, Add to Home screen does it.</Muted>
          </Row>
        )}
      </Group>
    </Section>
  );
}

// --- Sign-in ------------------------------------------------------------------------------------------

function SignInSettings() {
  const { inbox } = useDashboard();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  async function signOut() {
    await send("/api/dashboard/session", "DELETE").catch(() => {});
    router.refresh();
  }

  async function sendReset() {
    setSending(true);
    try {
      await send("/api/dashboard/setup-link", "POST");
      setConfirm(false);
      toast.success(`Reset link sent to ${inbox}. It works once, for 15 minutes.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Section title="Sign-in">
      <Group>
        <Row
          action={
            <Button size="sm" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          }
        >
          Signed in on this device.
          <Muted>It stays signed in until a week after your last visit.</Muted>
        </Row>
        <Row
          action={
            <Button size="sm" variant="secondary" onClick={() => setConfirm(true)}>
              Email a reset link
            </Button>
          }
        >
          New phone or authenticator app?
          <Muted>Replace the code your authenticator app makes.</Muted>
        </Row>
      </Group>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Email a reset link?"
        description={`It goes to ${inbox}. Finishing it replaces your authenticator code and signs out every device, this one too.`}
        action={sending ? "Sending…" : "Send the link"}
        busy={sending}
        onConfirm={sendReset}
      />
    </Section>
  );
}
