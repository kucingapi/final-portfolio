"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVariant } from "@/components/cv/Variant";
import { ArrowIcon } from "@/components/ui";
import { isTester, track } from "@/lib/analytics";
import { localePath } from "@/lib/i18n/lang";
import { useLang, useUi } from "@/lib/i18n/client";
import { videosOf, type StoredVideo } from "@/lib/proposal/proposal";
import { Watch, type PingBody } from "@/lib/proposal/watch";
import { BUFFERING, ENDED, PLAYING, loadYouTube, type YTPlayer } from "./youtube-api";

const pill = "inline-flex items-center gap-12 rounded-full px-28 py-12 text-lead font-semibold transition-colors";
const POLL_MS = 1000;

/**
 * The proposal of the visitor's tailored link: Novel's videos in order, his note, and one button on (the
 * rate card when the link has one, otherwise the contact form, tagged with the link). Without such a link,
 * a note instead. How the videos are watched goes to PostHog only (see src/lib/proposal/watch.ts).
 */
export function ProposalView() {
  const { current, loading } = useVariant();
  const lang = useLang();
  const t = useUi().proposal;
  const code = current?.code;
  const proposal = current?.variant.proposal;
  const videos = useMemo(() => videosOf(proposal), [proposal]);

  useEffect(() => {
    if (code && videos.length) track("proposal_viewed", { v_code: code, lang, videos: videos.length });
    // Once per code and page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, videos.length]);

  if (loading) return null;
  if (!code || !videos.length) {
    return (
      <div className="flex flex-col items-start gap-24">
        <p className="max-w-[60ch] text-lead text-midnight-100">{t.private}</p>
        <a href={localePath(lang, "/")} className={`${pill} border-2 border-midnight-50 text-midnight-50 hover:bg-midnight-50 hover:text-midnight-950`}>
          {t.home}
        </a>
      </div>
    );
  }

  const next = current.variant.rates
    ? { href: `${localePath(lang, "/rates")}?v=${code}&lang=${lang}&moved=1`, label: t.toRates, to: "rates" }
    : { href: `${localePath(lang, "/contact")}?proposal=${code}`, label: t.toContact, to: "contact" };

  return (
    <div className="flex flex-col gap-64 max-md:gap-40">
      <p className="max-w-[60ch] text-lead text-midnight-100">{t.intro(videos.length)}</p>
      <Videos key={code} code={code} videos={videos} />
      {proposal?.note && (
        <section aria-labelledby="proposal-note" className="flex max-w-[64ch] flex-col gap-16">
          <h2 id="proposal-note" className="text-lead font-semibold text-midnight-200">
            {t.note}
          </h2>
          <p data-ph-mask className="text-lead whitespace-pre-line text-midnight-50">
            {proposal.note}
          </p>
        </section>
      )}
      <div>
        <a
          href={next.href}
          data-proposal-next={next.to}
          onClick={() => track("proposal_next_clicked", { v_code: code, to: next.to, lang })}
          className={`${pill} bg-midnight-50 text-midnight-950 hover:bg-white`}
        >
          {next.label}
          <ArrowIcon className="size-28" />
        </a>
      </div>
    </div>
  );
}

function ping(body: PingBody, beacon: boolean) {
  const json = JSON.stringify(body);
  if (beacon && navigator.sendBeacon?.("/api/proposal", new Blob([json], { type: "application/json" }))) return;
  void fetch("/api/proposal", { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true }).catch(() => {});
}

function Videos({ code, videos }: { code: string; videos: StoredVideo[] }) {
  const t = useUi().proposal;
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState<number[]>([]);

  useEffect(() => {
    const tester = isTester();
    const boxes = slots.current;
    const watch = new Watch({
      code,
      videos,
      track: (event, props, beacon) => track(event, props, { beacon }),
      ping: (body, beacon) => {
        if (!tester) ping(body, beacon);
      },
    });
    // A player's methods exist only once it is ready; until then it is left out of `players`.
    const players: YTPlayer[] = [];
    let stopped = false;
    const playing = (p: YTPlayer) => [PLAYING, BUFFERING].includes(p.getPlayerState());

    loadYouTube()
      .then((YT) => {
        if (stopped) return;
        videos.forEach((v, i) => {
          const slot = boxes[i];
          if (!slot) return;
          // The player replaces the element it is given with its iframe, so it gets one React doesn't own.
          const el = document.createElement("div");
          slot.replaceChildren(el);
          new YT.Player(el, {
            videoId: v.id,
            host: "https://www.youtube-nocookie.com",
            width: "100%",
            height: "100%",
            playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
            events: {
              onReady: (e) => {
                if (stopped) return e.target.destroy();
                players[i] = e.target;
                watch.setDuration(i, e.target.getDuration());
              },
              onStateChange: (e) => {
                const p = e.target;
                watch.setDuration(i, p.getDuration());
                if (e.data === PLAYING) {
                  // One video at a time.
                  players.forEach((other, j) => j !== i && other && playing(other) && other.pauseVideo());
                }
                if (e.data === ENDED) {
                  watch.ended(i);
                  setEnded((list) => (list.includes(i) ? list : [...list, i]));
                } else watch.sample(i, p.getCurrentTime(), playing(p));
              },
            },
          });
        });
      })
      .catch(() => setFailed(true));

    const sampleAll = () =>
      players.forEach((p, i) => {
        if (p && playing(p)) watch.sample(i, p.getCurrentTime(), true);
      });
    const poll = window.setInterval(sampleAll, POLL_MS);
    // Where they were at the moment they left, not up to a poll earlier.
    const hide = () => {
      sampleAll();
      watch.hide();
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? hide() : watch.show());
    const onHide = hide;
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      stopped = true;
      watch.hide();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      players.forEach((p) => p?.destroy());
      boxes.forEach((slot) => slot?.replaceChildren());
    };
  }, [code, videos]);

  return (
    <ol className="flex flex-col gap-64 max-md:gap-40">
      {videos.map((v, i) => (
        <li key={v.id} id={`video-${i + 1}`} className="flex scroll-mt-120 flex-col gap-20" data-proposal-video={v.id}>
          <div className="flex flex-col gap-8">
            <span className="text-body font-semibold tracking-wide text-midnight-200 uppercase">{t.videoOf(i + 1, videos.length)}</span>
            <h2 className="text-h4 font-semibold text-midnight-50">
              {i + 1}. {v.title}
            </h2>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-[calc(var(--s)*24)] bg-midnight-900 max-md:rounded-[calc(var(--s)*16)]">
            {failed ? (
              <a
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 flex items-center justify-center text-lead font-semibold text-midnight-50 underline"
              >
                {t.youtube}
              </a>
            ) : (
              <div
                ref={(el) => {
                  slots.current[i] = el;
                }}
                className="absolute inset-0 size-full [&_iframe]:size-full"
                aria-label={t.play(v.title)}
              />
            )}
          </div>
          {ended.includes(i) && i < videos.length - 1 && (
            <a href={`#video-${i + 2}`} className={`${pill} self-start border-2 border-midnight-50 text-midnight-50 hover:bg-midnight-50 hover:text-midnight-950`}>
              {t.next}
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
