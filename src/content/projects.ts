/**
 * Projects: the home grid and every case-study page read from here.
 * Numbers come from Novel's career record (PRs, PostHog, Lighthouse runs); nothing is estimated
 * unless the copy says "about".
 */

/** Where an image sits inside a frame, in design px (see `--s` in globals.css). */
export type Placement = { w: number; h: number; x: number; y: number };

export type Art = {
  /** Full-colour render with the real product on screen. */
  real: string;
  /** Flat two-tone twin of the same render; the real one opens over it. */
  abstract: string;
  /** Intrinsic size of both files. */
  width: number;
  height: number;
  /**
   * The circle the reveal grows from, as fractions of the image (x, y of its centre; r of its width).
   * `drawn` circles are painted by the page as the "open" button; the others are already in the picture.
   */
  circle: { x: number; y: number; r: number; drawn: boolean };
  alt: string;
};

export type Shot = { src: string; width: number; height: number; alt: string; caption?: string };

export type Chapter = {
  id: string;
  title: string;
  problem: string;
  did: string[];
  result: string;
  /** One before/after figure that carries the chapter, set large beside the result. */
  figure?: { from?: string; to: string; label: string };
  /** A small data graphic instead of a screenshot. */
  bars?: { label: string; value: number; note: string }[];
  shot?: Shot;
};

/** A stretch of the work, for projects told in parts. It opens at chapter `from`. */
export type Part = { from: string; title: string; period: string; lede: string };

export const PLATFORMS = ["Web", "Mobile", "Desktop"] as const;
export const CONTEXTS = ["Multimodal", "Client work", "Side project", "Study"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Context = (typeof CONTEXTS)[number];

export type Project = {
  slug: string;
  title: string;
  /** Long name, when the title is an acronym. */
  fullName?: string;
  client: string;
  period: string;
  role: string;
  /** One line for the home grid chip. */
  tag: string;
  /** For the projects index: when, what kind of thing, and the one number that sums it up. */
  year: string;
  kind: string;
  stat: { value: string; label: string };
  /** Filters on the projects index. */
  platform: Platform;
  context: Context;
  summary: string;
  stack: string[];
  intro: string[];
  part: string[];
  links?: { label: string; href: string }[];
  /** Featured projects only: the device render with its circle reveal. */
  art?: Art;
  /** Home grid: card size and image crop. */
  card?: { w: number; h: number; place: Placement; mobileH: number };
  /** Case-study hero crop inside the 1240×700 frame. */
  hero?: Placement;
  /** Projects without a device render: a screenshot or design board for the hero and index. */
  cover?: Shot;
  chapters: Chapter[];
  parts?: Part[];
  /** Work that is still being built, said plainly on the card and the case page. */
  status?: { label: string; note: string };
  /** How the work was done, where it is worth saying. */
  method?: string;
};

const gallery = (src: string, alt: string, caption?: string, width = 2000, height = 1250): Shot => ({
  src,
  width,
  height,
  alt,
  caption,
});

export const projects: Project[] = [
  {
    slug: "agentflow",
    platform: "Web",
    context: "Multimodal",
    title: "AgentFlow",
    client: "Multimodal",
    period: "Aug 2024 – Oct 2026",
    role: "Founding frontend engineer",
    tag: "Multimodal · AI platform",
    year: "2024 – 2026",
    kind: "AI platform",
    stat: { value: "0 → 100+", label: "client people using it every week" },
    summary:
      "The AI platform banks and credit unions use to take a document from upload to decision. I wrote its frontend's first commit when it had no users; two years on, more than a hundred client people use it every week.",
    stack: ["Next.js", "React", "TypeScript", "Tailwind", "Storybook", "Python / FastAPI", "PostHog", "Playwright"],
    intro: [
      "AgentFlow takes a business document, a loan application, a balance sheet, an invoice, through AI extraction, human review and a decision. Banks, credit unions and other financial firms run their daily work on it. Its largest client is a bank that rolled it out to its lending teams.",
      "Reviewers live in two screens: the Runs table, where they find the document they need, and the review page, where they check what the AI read. Admins watch usage and manage their team.",
    ],
    part: [
      "I wrote the first commit of AgentFlow's frontend in August 2024: the Next.js app, sign-in, the component kit and the data layer. Then I built its screens one by one as the product found its shape: review, configure, monitor, ingest, and a view for each kind of AI agent.",
      "Over two years I built the screens those people work in every day: workflows, runs, document review, usage, team management, and the design system that ties them together. When a feature needed backend work I wrote that too, and I was one of the team's main frontend reviewers.",
    ],
    art: {
      real: "/projects/agentflow-real.webp",
      abstract: "/projects/agentflow-abstract.webp",
      width: 2400,
      height: 1800,
      circle: { x: 0.752, y: 0.29, r: 0.046, drawn: true },
      alt: "AgentFlow's Runs table on a laptop",
    },
    card: { w: 813, h: 741, place: { w: 988, h: 741, x: -87, y: 0 }, mobileH: 356 },
    hero: { w: 1300, h: 975, x: -30, y: -180 },
    method:
      "Most of this ran as parallel AI coding sessions that I directed: one worktree and one agent per lane, each held to written rules, tests and a review before anything merged. AI made the work fast; I read, tested and own what shipped.",
    parts: [
      {
        from: "first-commit",
        title: "The first build",
        period: "Aug 2024 – Oct 2025",
        lede: "AgentFlow started as a place for people to check the AI's work. I wrote the frontend's first commit, then built its screens one at a time as the product grew.",
      },
      {
        from: "design-system",
        title: "AgentFlow v3",
        period: "Sep 2025 – Oct 2026",
        lede: "In late 2025 the app moved to a new shell, sidebar and header. Through 2026 the work turned to making it one product: shared parts, faster tables, and features clients asked for by name.",
      },
    ],
    chapters: [
      {
        id: "growth",
        title: "From zero to a hundred people a week",
        problem:
          "In August 2024 AgentFlow had no frontend and no users. Whoever came would judge it by the screens they worked in all day.",
        did: [
          "Built those screens: the Runs table people find their documents in, the review page where they check the AI, Home, Usage and team settings.",
          "Kept them quick and clear as use grew: one filter bar, search that answers as you type, one design system on every page.",
          "Set up the product analytics, then used what people actually did to decide what to build next.",
        ],
        result:
          "In the summer of 2026 a bank rolled AgentFlow out to its business lending teams, and since then more than a hundred client people have used it every week.",
      },
      {
        id: "first-commit",
        title: "Day one",
        problem:
          "In August 2024 AgentFlow had a backend and an idea: AI agents read business documents, and a person checks their work. There was no frontend yet.",
        did: [
          "Wrote the first commit: a Next.js App Router project with sign-in, a protected app shell and an analytics home.",
          "Set the base every later screen was built on: a Tailwind and shadcn component kit, a typography scale, and React Query for server data.",
          "Built the date-range picker the tables filter by, with typed dates, in that first commit.",
        ],
        result:
          "The repository opens with my upload on 16 August 2024, and the team built on that base through every redesign since.",
        figure: { to: "16 Aug 2024", label: "my first commit, and the frontend's" },
      },
      {
        id: "review-page",
        title: "The review page",
        problem:
          "The whole product rests on one moment: a person checking what the AI read before it counts. That needs the document and the AI's answer side by side, and a way to fix the answer.",
        did: [
          "Built the review queue and the run page: the uploaded file on one side, the AI's fields as an editable form on the other, Approve and Reject at the bottom.",
          "Made the document viewer something people can work in: zoom that holds, several files per run with their names, selectable text and search inside PDFs, and an expanded view that keeps your page.",
          "Added what reviewers asked for: raw JSON with collapse and expand, copy and download on every table and JSON block, and a chat to ask the AI about the run.",
        ],
        result:
          "It is the screen reviewers spend their day in. The picture is today's version, after the v3 redesign, but the shape is the one built in 2024 and 2025: file on the left, the AI's answer on the right, a decision at the bottom.",
        shot: gallery("/projects/agentflow/review.webp", "The run review page: a loan application with a search hit, and the extracted fields beside it", "Today's run review page, searching inside the file. Demo data."),
      },
      {
        id: "around-review",
        title: "Set up, upload, watch",
        problem:
          "Around every review sit three other jobs: setting up what the AI should read, sending documents in, and seeing what ran, what failed and what it cost. Clients needed to do all three in the app, without asking the team.",
        did: [
          "Configure: the Create workflow flow, a page to define each document type's fields, and one to annotate sample documents for it.",
          "Create schema using AI: describe the fields you want, pick a model, and it drafts the document type's schema for you to edit.",
          "Ingest: upload many files at once by drag and drop, and a table of every submission with its stats.",
          "Monitor: status cards that filter the table, live refresh while a run is going, durations in whole seconds and cost in US dollars.",
        ],
        result:
          "Setup, upload and monitoring all moved into the app, and in July 2025 Home became a dashboard that leads into them.",
      },
      {
        id: "agents",
        title: "A screen for every agent",
        problem:
          "AgentFlow's AI does more than read fields. Each kind of agent returns something different, a report, a conversation, a decision, a class, and each needs its own way to be read and checked.",
        did: [
          "Report AI: rich reports with an expanded reading view.",
          "Conversational AI: a chat that handles question-by-question flows, renders tables, code and images, and scrolls wide visuals sideways.",
          "Decision AI: its inputs and outputs on the review page, refreshed as soon as a reviewer saves a change to the extracted data.",
          "Classification, multi-agent runs, and a progress tracker for each step of a run.",
        ],
        result:
          "Each new agent arrived with a screen to review it. The tab row on the review page, Report AI, Document AI, Conversational AI and Progress Tracker, is that work.",
        shot: gallery("/projects/agentflow/report-ai.webp", "The Report AI tab: a credit memo with its recommendation and checks", "Today's Report AI tab beside the input file. Demo data."),
      },
      {
        id: "design-system",
        title: "One design system",
        problem:
          "Home, Runs and Usage looked like three different products. A count of the code found 1,689 hand-typed colours (348 distinct), 33 separate status-to-colour maps and 417 font sizes typed as pixels.",
        did: [
          "Audited every v3 screen with a Playwright capture rig: 166 verified findings, 141 more checked and thrown out.",
          "Wrote the spec and made the calls: one token set, one status pill and one set of tones, one type ramp. Kept the brand orange even where it costs contrast, on purpose.",
          "Shipped it as a stack of nine pull requests, with a pixel-diff check proving the colour codemod moved nothing on screen.",
          "Added a lint rule, no-off-canon-color, so the next one-off colour fails the build.",
        ],
        result: "The whole stack merged on 22 September 2026. Every page now reads as one product, and new screens start from shared parts instead of copies.",
        figure: { from: "33", to: "1", label: "status-to-colour maps" },
        shot: gallery("/projects/agentflow/design-system-app.webp", "The Runs page built from the shared tokens and status pills", "The Runs page on the new tokens. Demo data."),
      },
      {
        id: "finding-work",
        title: "Finding work, fast",
        problem:
          "Reviewers search all day, and the tables fought them: slow search, sort controls that only showed on hover, statuses that did not match between the table and its filter.",
        did: [
          "One filter bar shared by every table: chips for what is set, one search field.",
          "A status filter that can tick a Processing and a Review status together, which took a backend change as well.",
          "Sort arrows visible at rest on every table, and one status, one colour, everywhere.",
          "Workflow search that filters in the browser instead of asking the server on every key.",
        ],
        result:
          "Typing “forum cu” used to send 10 requests and leave the list unfiltered; now it sends none and matches in 23 ms. Filter use went from about one in ten users to about seven in ten.",
        figure: { from: "~10%", to: "~70%", label: "of users filter their runs" },
        shot: gallery("/projects/agentflow/filters.webp", "The Runs filter panel with status groups", "The shared filter panel on Runs. Demo data."),
      },
      {
        id: "credits",
        title: "Credits you can see",
        problem:
          "A client's Usage page still said “Term ends Sep 20” three weeks after it ended, and nothing in the app said credits were nearly gone. Nothing stopped a run at zero, either: one client had run about 2,575 credits past its term.",
        did: [
          "Built the Usage dashboard through round after round of client feedback: date ranges you can type, totals that agree across pages, a layout that holds at laptop widths.",
          "Drew 26 design boards for running out: four treatments across four states. Picked a strip on every page plus the state on the Usage card; dropped the bell, because a bell is easy to miss.",
          "Set the rule with the team: credits cannot go over. At zero, or after the term, uploads and new runs stop and the app says why. Wrote the backend side, which refuses those requests.",
        ],
        result:
          "Shipped as one pull request per repo in October 2026. Review caught two real gaps, both fixed; 158 regression checks pass, and the stopped card keeps the live card's height so nothing jumps.",
        shot: gallery("/projects/agentflow/credits.webp", "Before and after: the Usage card and warning strip when credits are ending", "Before and after the credit-ending states.", 2000, 806),
      },
      {
        id: "run-names",
        title: "Runs that name themselves",
        problem:
          "Runs were named after the uploaded file, or not at all, so a reviewer looking for one applicant's loan scrolled through “scan_0042.pdf”. In client interviews it was the top complaint.",
        did: [
          "Names built from what is inside the document, in a fixed order of sources, and a five-to-seven-word summary that never opens with the status.",
          "Let workflow authors tell the AI what their runs should be named after.",
          "Masked emails and long numbers before anything reached the model: 0 of 28 personal-number probes leaked.",
          "Made naming a 40,000-row table go from 3.2–3.6 s to 1.0–1.5 s.",
        ],
        result:
          "Every run that does not fail now carries a name and a summary, in the table and in notifications. One lesson stuck: a small stand-in model passed my tests 12 times out of 12 while the real one did not, so the real model now gets checked before merge.",
        shot: gallery("/projects/agentflow/run-names.webp", "Home showing runs with AI-written names and summaries", "Runs with their AI-written names and summaries. Demo data."),
      },
      {
        id: "workbench",
        title: "A workbench in six days",
        problem:
          "A prospect told us they would sign with a competitor because we had no screen for reviewing translations. The team won one last chance: show it working within a week.",
        did: [
          "Owned the review side: the Runs list as a review queue, and the page for checking one translated workbook.",
          "Built it from reusable review widgets: auto-save, status pills, Find, sheet tabs like Excel, a pinned pager for 300 rows at a time, and an editor where the caret steps through HTML tags one character at a time.",
          "Ran all 12 of the prospect's sample files through the real pipeline and checked every row.",
        ],
        result:
          "First cut in three days, client test on schedule. By the last round all 12 files reached review with every row translated and no code lost; 19 of 5,867 rows were flagged for a person to check.",
        figure: { to: "6 days", label: "from the call to the client's own test" },
        shot: gallery("/projects/agentflow/workbench.webp", "The translation review page with status pills per row", "The translation review page. Sample content."),
      },
      {
        id: "analytics",
        title: "Data that steered the design",
        problem:
          "The five main pages had 132 clickable things and not one named analytics event, so every design argument was opinion.",
        did: [
          "Defined the tracking events for every main page in PostHog and shipped them.",
          "Read 30 days of real use, customers only.",
        ],
        result:
          "The numbers settled the Home redesign: almost everyone opens documents from Runs, and a typical Home visit lasts 7 seconds. Home became a doorway into each workflow's runs instead of a second Runs table.",
        bars: [
          { label: "Runs table", value: 84, note: "of document opens start here" },
          { label: "Home", value: 5, note: "of document opens start here" },
        ],
      },
    ],
  },
  {
    slug: "multimodal-website",
    platform: "Web",
    context: "Multimodal",
    title: "multimodal.dev",
    client: "Multimodal",
    period: "Sep – Oct 2026",
    role: "Frontend engineer, migration and speed",
    tag: "Multimodal · Website",
    year: "2026",
    kind: "Marketing site",
    stat: { value: "73 → 85", label: "median mobile Lighthouse score" },
    summary:
      "I moved the company website off Webflow to Next.js and Sanity, matched it page for page, launched it, then made it faster on phones.",
    stack: ["Next.js", "Sanity", "Vercel", "GSAP", "Lighthouse", "Beehiiv"],
    links: [{ label: "Visit multimodal.dev", href: "https://multimodal.dev" }],
    intro: [
      "multimodal.dev is where banks and credit unions first meet Multimodal: solution pages, the product tour, the newsletter, the demo form. It had grown to 485 pages on Webflow, and marketing needed an engineer for every change.",
      "The new site runs on Next.js with content in Sanity, so the team edits pages themselves.",
    ],
    part: [
      "The first build of the new site matched none of the old pages. I ran the effort that made it match, fixed the gaps inside the existing code, took it through launch, and then ran the speed work.",
      "I also wrote the site's design system from the pages that shipped, and the handbook marketing runs it from.",
    ],
    art: {
      real: "/projects/website-real.webp",
      abstract: "/projects/website-abstract.webp",
      width: 2400,
      height: 1800,
      circle: { x: 0.598, y: 0.69, r: 0.036, drawn: true },
      alt: "multimodal.dev on a phone",
    },
    card: { w: 390, h: 742, place: { w: 1364, h: 1023, x: -492, y: -115 }, mobileH: 742 },
    hero: { w: 1281, h: 961, x: -25, y: -106 },
    method:
      "Parity and speed both ran as rounds of parallel AI agents: read-only auditors first, then small build lanes, each change measured before it merged. I set the rules, read the diffs and owned the result.",
    chapters: [
      {
        id: "parity",
        title: "Match it, page for page",
        problem:
          "The new site had missing text, rough animation, wrong button colours and broken blog layouts. On a comparison rig it matched 0 of 20 page widths; the closest still differed by 19.9% of its pixels.",
        did: [
          "Built a parity rig that compares each page against the live Webflow site at several widths, using Webflow's own export of 189 pages.",
          "Fixed in rounds: GSAP animation, collection pages, 23 broken differences, and old security copy that 8 of 9 solution pages still carried.",
          "Moved newsletter sign-up straight to Beehiiv, so nothing is lost when the old Zapier link is switched off.",
        ],
        result: "The site launched matching the old one, with no lost pages and no broken sign-ups.",
        shot: gallery("/projects/website/home.webp", "The multimodal.dev home page", "The home page as launched."),
      },
      {
        id: "launch",
        title: "Launch day",
        problem: "Switching a 485-page site in one afternoon, without losing analytics or a single demo request.",
        did: [
          "Planned the switch so rollback was one DNS edit.",
          "Once DNS moved on 21 October 2026, set the Tag Manager and analytics settings on Vercel and checked in a browser that page views fired.",
        ],
        result: "The site switched at about 14:30 UTC and stayed up. Marketing now edits in Sanity without an engineer.",
        shot: gallery("/projects/website/solution.webp", "A credit-union lending solution page", "One of the solution pages."),
      },
      {
        id: "speed",
        title: "Faster on phones",
        problem: "Scores were uneven across the site, and the hero pages were heavy on mobile.",
        did: [
          "Ran seven read-only audit agents, then four build lanes, with one rule: no visible design change without the designer's sign-off.",
          "Measured through an HTTP/2 front, after finding the local server's HTTP/1.1 made good changes look worse.",
        ],
        result: "Across 27 page types, measured over three alternating runs: largest paint 4.2 s to 3.2 s, pages 961 KB to 578 KB, and pages scoring 90 or more went from 3 to 8.",
        figure: { from: "73", to: "85", label: "median mobile Lighthouse score" },
      },
      {
        id: "handover",
        title: "A site marketing can run",
        problem: "The ten best pages came from three stylesheets that disagreed on 51 values.",
        did: [
          "Wrote the design system from the pages that shipped, with the designer's colour rule, and swapped 264 hard-coded values for shared ones.",
          "Made one Book a demo block for every page, approved by the designer.",
          "Put Sanity Studio on preview deployments, and wrote the handbook the team runs the site from.",
        ],
        result: "New pages come out of shared parts, and content changes no longer wait for an engineer.",
        shot: gallery("/projects/website/idp.webp", "The Intelligent Document Processing page", "A product page built from the shared blocks."),
      },
    ],
  },
  {
    slug: "tia",
    platform: "Web",
    context: "Client work",
    title: "TIA",
    fullName: "The Intelligent Anamnesis",
    client: "TUM Venture Labs × TUM Sports Orthopedics",
    period: "2023 – 2024",
    role: "Web developer and product designer",
    tag: "TUM · Health",
    year: "2023 – 2024",
    kind: "Web app",
    stat: { value: "100+", label: "questions with branching medical logic" },
    summary:
      "A digital questionnaire that turns an orthopedic patient's answers into a picture a doctor can read before the consultation.",
    stack: ["React", "Material UI", "Supabase", "PostgreSQL", "Figma"],
    intro: [
      "Before an orthopedic consultation, doctors need the patient's history: where it hurts, since when, what has been tried. TIA collects that through a smart questionnaire and lays it out so the doctor can take it in at a glance.",
      "It was a pilot between TUM Venture Labs and the Sports Orthopedics department at the Technical University of Munich, built for 500+ patients and their doctors.",
    ],
    part: [
      "I was the only developer and also designed the product, working with the Master's and PhD students who led the research.",
      "I built the questionnaire's medical logic, more than 100 questions and answers that branch on what the patient says, and the backend that stores it.",
    ],
    art: {
      real: "/projects/tia-real.webp",
      abstract: "/projects/tia-abstract.webp",
      width: 2400,
      height: 1800,
      circle: { x: 0.6175, y: 0.482, r: 0.068, drawn: false },
      alt: "The TIA landing page on a laptop",
    },
    card: { w: 390, h: 480, place: { w: 642, h: 481, x: -126, y: -1 }, mobileH: 480 },
    hero: { w: 1300, h: 975, x: -30, y: -180 },
    chapters: [
      {
        id: "brief",
        title: "One question at a time",
        problem:
          "How do you collect a full orthopedic history from patients without a form that scares them off, and still hand the doctor something they can use in the room?",
        did: [
          "Broke the history into single questions with a clear next step, so a patient only ever sees one thing to answer.",
          "Encoded the medical logic: follow-up questions appear only when an earlier answer calls for them.",
        ],
        result: "More than 100 questions and answers, with the branching the doctors asked for, in a flow a patient can finish on their own.",
        figure: { to: "100+", label: "questions with branching medical logic" },
        shot: { src: "/projects/tia/question.webp", width: 806, height: 354, alt: "A TIA question step asking whether the patient has pain", caption: "One question per step." },
      },
      {
        id: "design",
        title: "Designed to ship",
        problem: "A pilot lives or dies on getting in front of patients, not on a bespoke look.",
        did: [
          "Designed in Figma on Material UI's components, with a small palette and type scale of our own.",
          "Kept the interface as plain as possible so the team could test with patients early.",
        ],
        result: "The design went from Figma to working screens fast, and stayed consistent because it was built from one component set.",
        shot: { src: "/projects/tia/style-guide.webp", width: 1075, height: 782, alt: "TIA colour palette and type scale", caption: "The palette and type scale." },
      },
      {
        id: "build",
        title: "Built to be hosted by the hospital",
        problem: "The client wanted to be able to run TIA on its own servers.",
        did: [
          "Built the frontend in React with a clean architecture, so screens, logic and data stay apart.",
          "Chose Supabase on PostgreSQL for the backend because it is open source and can be self-hosted, and it kept development fast.",
        ],
        result: "A working pilot, built solo over seven months, ready for 500+ patients and their doctors.",
        figure: { to: "500+", label: "patients the pilot was built for" },
        shot: { src: "/projects/tia/landing.webp", width: 685, height: 672, alt: "The TIA landing page", caption: "The landing page." },
      },
    ],
  },
  {
    slug: "raya-airways",
    platform: "Web",
    context: "Client work",
    title: "Raya Airways cargo portal",
    client: "Raya Airways, through Belli",
    period: "Apr – May 2025",
    role: "Frontend engineer (contract)",
    tag: "Raya Airways · Customer portal",
    year: "2025",
    kind: "Customer portal",
    stat: { value: "−2,280", label: "lines of unused code removed" },
    summary:
      "The web portal where Raya Airways' customers schedule their own cargo: find a flight, book space on it, and follow the shipment. I built its flight schedule and tightened the booking form.",
    stack: ["Next.js", "TypeScript", "shadcn/ui", "TanStack Table", "React Hook Form", "Clerk"],
    intro: [
      "Raya Airways is a cargo airline. Its customers, mostly cargo agents buying space for their shipments, schedule that cargo themselves on this web portal.",
      "It runs on Belli, an air-cargo platform that handles rates, flights, air waybills and load planning for airlines, and it is white-labelled: Raya's customers get a Raya-branded site on its own subdomain. There they check route rates, look up flights, book space (the air waybill number is filled in automatically) and follow each booking's progress.",
    ],
    part: [
      "I joined the Belli team while the portal was being built for Raya Airways, and built the Flight Schedule, the page a customer opens to find a flight before booking. I also reworked the booking form and cleaned up Belli's main app.",
    ],
    art: {
      real: "/projects/raya-real.webp",
      abstract: "/projects/raya-abstract.webp",
      width: 2400,
      height: 1800,
      circle: { x: 0.79, y: 0.31, r: 0.036, drawn: true },
      alt: "The Raya Airways cargo portal's flight schedule on a laptop",
    },
    card: { w: 813, h: 480, place: { w: 1067, h: 800, x: -152, y: -40 }, mobileH: 230 },
    hero: { w: 1157, h: 868, x: 13, y: -23 },
    chapters: [
      {
        id: "flight-schedule",
        title: "Find a flight, then book it",
        problem: "Customers had to know which flight they wanted before they could start a booking.",
        did: [
          "Built the Flight Schedule page: pick a date, an origin and a destination, and see every upcoming flight on that route.",
          "Destinations narrow to the routes that actually leave from the chosen origin, so a customer cannot ask for a route that does not exist.",
          "A refresh button and a table matched to the rest of the portal: flight, departure, route, aircraft, and a Book button.",
          "Book opens a new booking with the route and flight already filled in.",
        ],
        result: "Finding a flight and starting its booking is one page and one click.",
        shot: {
          src: "/projects/raya/flight-schedule.webp",
          width: 2000,
          height: 1250,
          alt: "The Raya-branded Flight Schedule page with date, origin and destination filters and a table of flights",
          caption: "Recreated from the shipped code in Raya's theme, with sample flights; the portal itself sits behind a login.",
        },
      },
      {
        id: "booking-form",
        title: "A booking form that matches",
        problem: "The order details and shipment sections of the booking form did not line up with the rest of the portal.",
        did: ["Reworked both sections and the form around them to the portal's table style and columns."],
        result: "Booking reads as part of the same product as the schedule it starts from.",
      },
      {
        id: "housekeeping",
        title: "Housekeeping in Belli's main app",
        problem: "Belli's main app carried integrations nobody used, and support could not see who was writing in.",
        did: [
          "Removed the unused Supabase and Stigg integrations: 2,280 lines gone.",
          "Connected Intercom with the signed-in user's details, and fixed Google Tag Manager.",
        ],
        result: "A smaller app, and support conversations that start with the customer's account already known.",
        figure: { to: "−2,280", label: "lines of unused code removed" },
      },
    ],
  },
  {
    slug: "bank-sampah",
    platform: "Desktop",
    context: "Side project",
    title: "Bank Sampah",
    client: "A neighbourhood waste bank",
    period: "Mar – Sep 2026",
    role: "Designer and developer, on my own",
    tag: "Side project · Desktop app",
    year: "2026",
    kind: "Desktop app",
    stat: { value: "7.4+ t", label: "of residents' waste weighed through it" },
    summary:
      "An offline desktop app that runs a neighbourhood waste bank: weigh in residents' recyclables, pay them for it, and sell the sorted material on. More than 7.4 tonnes of waste have gone through it so far.",
    stack: ["Tauri", "Rust", "React", "TypeScript", "SQLite", "Tailwind", "shadcn/ui", "Cloudflare Pages"],
    intro: [
      "A bank sampah, a waste bank, is how many Indonesian neighbourhoods recycle. On collection days residents bring sorted waste, volunteers weigh it by category and credit each person at that day's price, and the material is later sold on to collectors at a higher one.",
      "This one ran on Excel logbooks: 48 price categories, a weighing for every bag, a payout for every resident, and the sales to collectors on top.",
    ],
    part: [
      "I designed and built it on my own, in my spare time, for the volunteers who run it. It is a Windows app that needs no internet, keeps everything in one SQLite file on the laptop, and updates itself.",
    ],
    cover: gallery("/projects/bank-sampah/overview.webp", "The Bank Sampah overview: total weight collected, money paid out, and the material mix", "The overview, running the real app on sample data."),
    chapters: [
      {
        id: "entry",
        title: "Keeping up with the queue",
        problem:
          "On a collection day residents queue with their bags while each one is weighed. Whatever the volunteer types has to keep pace with the scale.",
        did: [
          "A full-page deposit form with every category in price-list order, arrow keys to move through the grid, and a command palette to jump to a category.",
          "A weight field that takes sums, so “2,5+1,75” from two weighings becomes 4.25 kg, with the comma as the decimal point, as Indonesians write it.",
          "The payout worked out live as weights go in, split by the collector each item will be sold to.",
        ],
        result: "A resident's whole deposit goes in as it is weighed, with the amount owed already on screen.",
        shot: gallery("/projects/bank-sampah/entry.webp", "Editing a deposit: weights per category and the live payout", "A deposit being edited. Sample data; the names are made up."),
      },
      {
        id: "money",
        title: "Prices, payouts and sales",
        problem:
          "Prices change from one collection to the next, collectors pay more for bigger loads, and residents are paid out from their savings twice a year. On the spreadsheets, working out what each resident was owed meant going page by page through every collection at its own prices, and took weeks.",
        did: [
          "Each session keeps its own copy of the price list, so changing a price never rewrites an old session.",
          "Collector prices in weight tiers, worked out like tax brackets, and a sales manifest for each collector.",
          "Semester savings payouts and collector reports that print straight from the app.",
          "An import for the old Excel logbooks, so past sessions came along.",
        ],
        result:
          "A session closes with every resident's payout and every collector's manifest agreeing with the scale, and the semester payout, worked out from every recorded deposit, is ready in seconds.",
        figure: { to: "Seconds", label: "instead of weeks, to work out every resident's semester payout" },
        shot: gallery("/projects/bank-sampah/session.webp", "A collection session: every deposit with its weights and payout", "One collection session. Sample data; the names are made up."),
      },
      {
        id: "offline",
        title: "Offline, and it updates itself",
        problem:
          "The volunteers work on one laptop, not always online, and nobody there should have to reinstall anything or worry about losing the data.",
        did: [
          "Tauri with a local SQLite file; the schema moves forward on its own with migrations as new versions add columns.",
          "Signed updates served from Cloudflare Pages: the app checks on start, shows the download, and restarts on the new version.",
          "Backups to a cloud database (Turso) and CSV exports, both from the settings page.",
        ],
        result:
          "It has been in use since March 2026, and more than 7.4 tonnes of residents' waste have been weighed through it. Its September backup held 10 collection sessions, 407 deposits with 3,449 weighed items, and Rp 11.9 million paid out to 152 residents.",
        figure: { to: "7.4+ tonnes", label: "of residents' recyclables weighed in since March 2026" },
      },
    ],
  },
  {
    slug: "payroll-formatter",
    platform: "Desktop",
    context: "Client work",
    title: "Payroll Formatter",
    client: "A private client's payroll team",
    period: "Mar 2025",
    role: "Freelance developer, on my own",
    tag: "Client work · Desktop tool",
    year: "2025",
    kind: "Desktop tool",
    stat: { value: "Minutes", label: "instead of 2 to 3 days for each tax upload" },
    summary:
      "A small Windows tool that prepares a company group's e-Bupot tax uploads in minutes, where the payroll team used to spend 2 to 3 days digging the figures out of the database by hand. It cost 99% less than a year on the vendor's new platform, and the client owns the code.",
    stack: ["Python", "Tkinter", "pyodbc", "MS Access", "openpyxl", "PyInstaller", "Rust"],
    intro: [
      "In 2025 Indonesia moved withholding-tax reporting to e-Bupot, with its own spreadsheet formats for the upload: BPMP for each month's PPh 21 slip and BPA1 for the yearly 1721-A1.",
      "The client is a group of companies whose payroll lives in an old Microsoft Access program. Its exports did not match the new formats, so each period someone went through the database sub-company by sub-company, found every employee's figures by hand and retyped them: 2 to 3 days of work.",
      "The program's vendor offered a way out: move to its new platform, at Rp 5,000 per user each month. For about 8,000 people, that was Rp 40 million every month.",
    ],
    part: [
      "I built it in March 2025: the first working version, both forms, in a day, then refinements over the next three weeks. It ships as a single .exe the payroll staff run on their own machine.",
    ],
    chapters: [
      {
        id: "read",
        title: "From days to minutes",
        problem:
          "The group has many sub-companies, and the figures each tax form needs sit in an Access database only the old payroll program was meant to read. Each period the payroll team looked them up by hand, company by company and employee by employee, for 2 to 3 days.",
        did: [
          "Read the database directly through the Access ODBC driver, as a 32-bit build to match the client's Office.",
          "Pull every employee in the export with one query per run, instead of one lookup per person.",
          "Match each employee by national ID, falling back to tax ID, and take each person's latest month for the yearly slip.",
        ],
        result:
          "Drop in the period's export and the tool finds every figure itself. Preparing the upload went from 2 to 3 days of lookups to a couple of minutes, with the numbers taken from the source instead of retyped.",
        figure: { from: "2–3 days", to: "Minutes", label: "to prepare each period's tax upload" },
      },
      {
        id: "cost",
        title: "99% cheaper than renting it",
        problem:
          "The vendor's new platform would have charged Rp 5,000 per user per month. With about 8,000 people on payroll, that was Rp 40 million every month, Rp 480 million a year, for a job that comes down to reshaping one export into two upload files.",
        did: [
          "Scoped the tool to exactly that job: read the payroll the client already has, write the two e-Bupot forms.",
          "Built it to run on the payroll staff's own machine, with no server, subscription or per-user fee.",
          "Handed over the code with the tool, so the client owns both.",
        ],
        result: "The client paid about Rp 3 million once: 99% less than a year on the vendor's platform, and nothing to pay after.",
        figure: { to: "99%", label: "less than a year on the vendor's platform: Rp 3 million once, against Rp 40 million a month." },
      },
      {
        id: "write",
        title: "Writing the new forms",
        problem: "The new formats are strict about columns and codes, and the payroll exports were not always laid out the same way.",
        did: [
          "Matched the Indonesian column headings loosely, so small differences between exports still work.",
          "Put the tax rules in code: the rate from tax and gross pay, a default deduction date, full or part year and months worked, the gross-up allowance.",
          "Filled the employer's branch ID from its tax ID as you type.",
          "Wrote the BPMP file with its 16 columns and BPA1 with its 31, under names that never overwrite last month's.",
        ],
        result: "Drop in the month's export, pick the form, and get a file ready for upload to e-Bupot.",
      },
      {
        id: "ship",
        title: "Shipping one small file",
        problem: "The payroll staff needed something they could double-click, on a machine with nothing extra installed.",
        did: [
          "A drag-and-drop window in Tkinter, packed into one .exe with PyInstaller.",
          "Left out the heavy libraries the tool never uses, then wrote a version without pandas.",
          "Tried a Rust port with iced for a smaller native binary; the trimmed Python build was the one that shipped.",
        ],
        result: "My first build was 210 MB; trimmed, the app shipped as a single 39 MB .exe.",
        figure: { from: "210 MB", to: "39 MB", label: "the app, from my first build to the one that shipped" },
      },
    ],
  },
  {
    slug: "mortgage-review",
    platform: "Web",
    context: "Multimodal",
    title: "Mortgage document review",
    client: "A US mortgage lender, through Multimodal",
    period: "May – Aug 2024",
    role: "Frontend engineer, on my own",
    tag: "Multimodal · Review tool",
    year: "2024",
    kind: "Review tool",
    stat: { value: "−80%", label: "loan processing cost for the client" },
    summary:
      "The screen where a mortgage lender's team checks what Multimodal's AI read from each loan document, fixes it, and sends it on. I built it on my own in my first months at Multimodal.",
    stack: ["React", "TypeScript", "Vite", "TanStack Query", "TanStack Table", "react-pdf", "shadcn/ui", "Tailwind"],
    intro: [
      "A US mortgage lender sends the documents in each loan file, pay stubs, bank statements, employment verifications, through Multimodal's AI, which works out what each document is and reads the fields the loan needs.",
      "A person still checks that work before it reaches the loan system. Every correction they make is also worth something to the model that made the mistake.",
    ],
    part: [
      "I built the review app on my own, from the first commit in May 2024 to the hand-over in August, when it moved into the lender's own repository and I helped fit it into their setup.",
    ],
    cover: gallery("/projects/mortgage-review/detail.webp", "A loan document beside the fields the AI read from it", "The review page, running the real app on made-up data.", 2000, 1250),
    chapters: [
      {
        id: "queue",
        title: "A queue to work through",
        problem: "Reviewers face a steady stream of documents across many loans, and need the next one that is waiting, fast.",
        did: [
          "Pending and Completed queues with a search that forgives typos, date filters, sorting and CSV export.",
          "Moved paging to the server in July, so the queue loads one page at a time.",
          "Next and Previous on the review page follow the table's own order and filters, so a reviewer never has to go back to the list.",
        ],
        result: "A reviewer works straight down the queue, one document after another.",
        shot: gallery("/projects/mortgage-review/queue.webp", "The review queue: documents waiting, with their loan, type and dates", "The pending queue. Made-up data.", 2000, 1250),
      },
      {
        id: "side-by-side",
        title: "The page beside its data",
        problem: "Checking means comparing every value the AI pulled out with the spot on the page it came from.",
        did: [
          "The document in a viewer with zoom and rotate, next to the fields read from it.",
          "Focusing a field outlines where the AI found it on the page, from the coordinates it returns.",
          "The document type with the AI's confidence, which the reviewer can change from a list.",
          "Forms for the harder documents: employment verifications with several employers, bank statements with several accounts.",
        ],
        result: "Each value is checked against its source at a glance, not hunted for.",
        shot: gallery("/projects/mortgage-review/detail.webp", "A loan document beside its extracted fields, one field highlighted on the page", "A field and the spot on the page it came from. Made-up data.", 2000, 1250),
      },
      {
        id: "feedback",
        title: "Corrections that count twice",
        problem: "A fixed value has to land in the loan system, and the model should learn from it too.",
        did: [
          "Save writes the checked fields to the client's loan system and records the review.",
          "Every correction also goes back to Multimodal as feedback for the model.",
          "A history of what the AI returned and of every edit since, plus similar documents from the same loan.",
          "Resend a document to OCR, take it off the queue, or add a borrower, bank or employer to a pick list when the loan system doesn't have it yet.",
        ],
        result: "With the tool in use, annotation was 50% faster, and the client's loan processing costs fell by 80%.",
        figure: { to: "50%", label: "faster annotation" },
        shot: gallery("/projects/mortgage-review/completed.webp", "Reviewed documents with the AI's classifier and extraction accuracy and the time each review took", "Completed reviews, scored for the model. Made-up data.", 2000, 1250),
      },
    ],
  },
  {
    slug: "sidaku",
    platform: "Mobile",
    context: "Study",
    title: "SIDAKU",
    fullName: "Sistem Informasi Database Koperasi dan UMKM",
    client: "PLUT-KUMKM Kota Batu",
    period: "Sep 2023 – Jul 2024",
    role: "Android and API developer, my thesis",
    tag: "Thesis · Android app",
    year: "2024",
    kind: "Android app and API",
    stat: { value: "12", label: "kinds of business record owners keep themselves" },
    summary:
      "My undergraduate thesis: an Android app and REST API that let small businesses in Batu register with the city's business-service centre and keep their own records.",
    stack: ["Kotlin", "Jetpack Compose", "Retrofit", "Django REST Framework", "PostgreSQL", "Docker", "Cloud Run"],
    intro: [
      "PLUT-KUMKM is Kota Batu's service centre for cooperatives and small businesses (UMKM). It kept their data in a web system that only its staff could edit, and its news, regulations and events lived on a website.",
      "SIDAKU puts that system in the owners' hands: they register on their phone, the centre approves them, and from then on they keep their own business and product data up to date.",
    ],
    part: [
      "The web dashboard already existed. For my thesis at Universitas Brawijaya I added a REST API to it and built the Android app from scratch, from October 2023 to June 2024. A teammate joined for a refactor pass in July 2024.",
    ],
    cover: gallery("/projects/sidaku/cover.webp", "SIDAKU on Android: the business directory with its map, regulations, and adding a product", "Screens of the real app from my thesis, with test data."),
    chapters: [
      {
        id: "api",
        title: "An API for an existing system",
        problem: "The centre's Django site rendered pages for its staff. There was nothing a phone app could talk to.",
        did: [
          "Added a REST layer with Django REST Framework and JWT sign-in, beside the existing pages.",
          "Public endpoints for news, regulations, the business map and the city's statistics.",
          "Twelve kinds of record an owner can keep: products, permits, suppliers, staff, machines, training and more.",
          "Packaged it in Docker on Google Cloud Run, with PostgreSQL and files in Cloud Storage.",
        ],
        result: "The app and the staff dashboard read and write the same data.",
        figure: { to: "12", label: "kinds of business record, kept by the owners" },
      },
      {
        id: "approval",
        title: "Register, get approved, take over",
        problem: "Anyone can install an app, but only real local businesses should be able to put data into the city's records.",
        did: [
          "A two-step sign-up that asks for identity documents (KTP, KK, BPJS) and the business logo.",
          "An approval switch for the centre's staff; until it is on, the app shows the account as waiting.",
          "Once approved, owners edit their business details and add products with photos.",
          "Events owners can join or leave from the app.",
        ],
        result: "The data comes from the people who run the businesses, and the centre still decides who gets in.",
        shot: gallery("/projects/sidaku/sign-up.webp", "Sign-up, sign-in and the account page of the SIDAKU app", "Sign-up, sign-in and the account page. Test data."),
      },
      {
        id: "android",
        title: "The Android app",
        problem: "Business owners needed one place on their phone for their records and for what the centre publishes.",
        did: [
          "Built in Kotlin with Jetpack Compose and Material 3, in a clean MVVM structure with separate navigation for sign-in, news and events.",
          "News, regulations you can download as PDF, and a searchable directory of local businesses, each with its map location and products.",
          "Sign-in kept with DataStore, and requests through Retrofit; later moved to Kotlin Flow in the refactor pass.",
        ],
        result: "Version 3.1 covers the whole loop: sign up, get approved, keep records, and follow the centre's news and events.",
        shot: gallery("/projects/sidaku/products.webp", "Adding a product with a photo, and the business's product list", "Adding a product, then the product list. Test data."),
      },
    ],
  },
  {
    slug: "breel",
    platform: "Mobile",
    context: "Study",
    title: "Breel",
    client: "Bangkit Academy capstone",
    period: "May – Jun 2023",
    role: "Team lead, Android developer and designer",
    tag: "Bangkit capstone · Android app",
    year: "2023",
    kind: "Android app",
    stat: { value: "1 month", label: "from idea to a working app, team of six" },
    summary:
      "A freelance marketplace with mentoring, for Indonesia's beginner freelancers. I led a team of six to a working Android app in a month, as our Bangkit Academy capstone.",
    stack: ["Kotlin", "Android", "MVVM", "Firebase", "Express", "PostgreSQL", "Figma"],
    links: [{ label: "Breel on GitHub", href: "https://github.com/Breel-capstone" }],
    intro: [
      "Breel connects beginner freelancers with entry-level projects and with experienced freelancers who mentor them for a monthly fee.",
      "We started from a survey: 9 of the 16 people we asked who had tried freelancing had given up, and the research we read put the hardest part at the start, landing a first client.",
    ],
    part: [
      "Bangkit Academy, run by Google, Gojek, Tokopedia and Traveloka, ends with a team capstone. I led ours as product manager, designed the app, and built it with one other Android developer, while two machine-learning and two cloud engineers built the rest.",
    ],
    cover: gallery("/projects/breel/screens.webp", "Breel's screens: projects, mentors, proposals and chat", "Breel's high-fidelity screens.", 1280, 960),
    chapters: [
      {
        id: "plan",
        title: "Planning a month",
        problem: "Six people, three disciplines, no designer, and one month to a working app.",
        did: [
          "Split the work into a shared plan with a daily meeting, and kept every task on one calendar.",
          "Ran it in short agile cycles so the app, the models and the backend met in the middle.",
        ],
        result: "More than 100 tasks closed in 30 days.",
        figure: { to: "100+", label: "tasks closed in 30 days" },
        shot: gallery("/projects/breel/plan.webp", "The team's May 2023 calendar of tasks and daily meetings", "The team plan for May 2023.", 1089, 866),
      },
      {
        id: "design",
        title: "Designing it",
        problem: "With no designer on the team, the app's look and flows were mine to make, fast.",
        did: [
          "A style guide on Material 3: colour, type and navigation.",
          "Wireframes for each flow, then high-fidelity screens for search, project and mentor details, proposals, chat, notifications and the profile.",
        ],
        result: "A full design the two of us could build from without guessing.",
        shot: gallery("/projects/breel/hifi.webp", "Every high-fidelity screen of Breel, grouped by flow", "The high-fidelity screens, grouped by flow.", 2000, 1873),
      },
      {
        id: "build",
        title: "Building it",
        problem: "The design had to become a working Android app in the time left.",
        did: [
          "Built it natively in Kotlin with an MVVM structure, on Firebase and the team's Express and PostgreSQL backend.",
          "Kept the team on one plan as the backend, the models and the app came together.",
        ],
        result: "We shipped a working app on time, and I graduated from Bangkit with distinction, in the top 10% of the cohort.",
        shot: gallery("/projects/breel/wireframes.webp", "Breel's wireframes for each flow", "The wireframes the build started from.", 2000, 1279),
      },
    ],
  },
  {
    slug: "seru-room",
    platform: "Web",
    context: "Side project",
    title: "Seru Room",
    client: "My own product",
    period: "Sep 2026 – now",
    role: "Designer and developer, on my own",
    tag: "Side project · Web app",
    year: "2026",
    kind: "Web app",
    status: { label: "In progress", note: "In progress, no users yet" },
    stat: { value: "6 digits", label: "is all the audience needs to join" },
    summary:
      "A live presentation app: the presenter runs a deck, and the room answers polls, word clouds, rankings and questions from their phones while the results move on the big screen. Still being built, with no users yet.",
    stack: ["Next.js", "React", "TypeScript", "Tailwind", "Cloudflare Durable Objects", "Turso", "Drizzle", "Better Auth", "Playwright"],
    intro: [
      "Seru means fun, lively, in Indonesian. Seru Room is for teachers, facilitators and speakers who want the room to answer, not just listen.",
      "A presenter builds a deck in the editor and presents it as a live session. The audience joins with a six-digit code or a QR from whatever phone they have, and the presenter's screen reacts to every answer.",
    ],
    part: [
      "I am building it on my own: the product, the design and the code. It runs end to end, but it has not had a real audience yet.",
    ],
    method:
      "Built as AI coding sessions that I plan and review. Each starts from a written ticket and a glossary of the product's words, and end-to-end tests drive the real server, a real database and the real live worker.",
    cover: gallery("/projects/seru-room/live-poll.webp", "The presenter's live view: a multiple-choice question with its results as columns, and the join code and QR beside it", "The presenter's view mid-session, running locally. Sample deck; the eight people answering are test accounts."),
    chapters: [
      {
        id: "live",
        title: "A room that reacts",
        problem:
          "Answers have to reach the big screen as people tap, over venue Wi-Fi that drops, and the presenter can never lose the session halfway through.",
        did: [
          "One Cloudflare Durable Object per session code holds the live state and talks WebSocket to the presenter and every phone.",
          "Results live only as long as the session; nothing about who answered what is kept after it ends.",
          "A reload on either side picks the session back up instead of stranding it.",
        ],
        result: "Answers land on the presenter's screen as they come in, and a dropped phone or a reloaded laptop rejoins the same session.",
        shot: gallery("/projects/seru-room/live-cloud.webp", "A word cloud on the presenter's screen, built from eight answers", "A word cloud slide after eight answers. Sample content."),
      },
      {
        id: "join",
        title: "Joining in one step",
        problem: "Nobody in an audience will install an app or make an account to answer one question.",
        did: [
          "Join with the six-digit code or by scanning the QR on the lobby screen.",
          "Ask for a display name only when the presenter wants names.",
          "Four kinds of slide, multiple choice, word cloud, ranking and Q&A, each laid out for a small phone first.",
        ],
        result: "Joining takes a code and a tap, on any phone with a browser.",
        shot: gallery("/projects/seru-room/audience.webp", "A participant's phone after voting on a multiple-choice question", "What a participant sees after voting. Sample content."),
      },
      {
        id: "editor",
        title: "An editor that saves itself",
        problem: "Presenters build decks in spare minutes between other work, and one lost edit is enough to stop trusting a tool.",
        did: [
          "Edits save as you make them, so there is no save button to forget.",
          "Sign-in by email magic link, so there is no password either.",
          "English and Bahasa Indonesia, light and dark, all treated as first-class.",
        ],
        result: "A deck goes from empty to ready to present without a single save.",
        shot: gallery("/projects/seru-room/editor.webp", "The deck editor: the slide list, the slide canvas and its settings", "The deck editor with a sample deck."),
      },
    ],
  },
  {
    slug: "jagaday",
    platform: "Desktop",
    context: "Side project",
    title: "JagaDay",
    client: "My own product",
    period: "Oct 2026 – now",
    role: "Designer and developer, on my own",
    tag: "Side project · Windows and Android",
    year: "2026",
    kind: "Desktop and phone app",
    status: { label: "In progress", note: "In progress, not yet run on real devices" },
    stat: { value: "2 devices", label: "guarded at once when a planned block starts" },
    summary:
      "A focus app that turns a calendar plan into enforcement: when a planned block starts, the apps and websites you chose are blocked on the laptop and the phone at once. Still being built, with no users yet.",
    stack: ["Rust", "Tauri", "React", "TypeScript", "Kotlin", "Jetpack Compose", "Supabase", "Browser extension"],
    intro: [
      "Jaga means to guard, in Indonesian. I plan my day in Google Calendar, then lose the focus blocks to YouTube and Discord on whichever device is closest. The blockers I tried either guard one device or put scheduling behind a paywall.",
      "JagaDay reads the calendar instead. Tag an event #focus and, when it starts, the apps and websites in its profile are blocked on Windows and Android together, then released when it ends.",
    ],
    part: [
      "I wrote the spec, designed it and am building it on my own, for myself first. Every component builds and passes its automated tests; none of it has run on a real phone, a real Windows laptop or a real Google account yet.",
    ],
    cover: gallery("/projects/jagaday/today.webp", "JagaDay's Today screen: the current block with its tick timer, and the day's plan against what was clocked", "The Today screen of the real build, on sample data.", 1280, 900),
    chapters: [
      {
        id: "sync",
        title: "One plan, two devices",
        problem: "A block that only guards the laptop just moves the distraction to the phone.",
        did: [
          "Calendar import runs on the server every five minutes, so the laptop and the phone see the same blocks without either one holding Google tokens.",
          "Each device keeps its own local database and syncs through Supabase, so blocking keeps working offline.",
          "A Windows service enforces the next eight days of blocks even when the app or the network is gone, and a browser extension blocks the websites.",
        ],
        result:
          "One acceptance test plays a whole day across the real code of every part, on a simulated clock: plan, import, block on both devices, release.",
        shot: gallery("/projects/jagaday/calendar.webp", "The week calendar with focus blocks, one imported from Google Calendar", "The week view. Sample data.", 1280, 998),
      },
      {
        id: "rules",
        title: "Hard to bypass, easy to understand",
        problem: "A blocker you can switch off in two clicks is not a blocker, but one that never says why feels broken.",
        did: [
          "A running block can be extended from the calendar, but never shortened or cancelled.",
          "A locked block ends only through a slow emergency exit: wait out a delay, then type a phrase. It is logged as an early end.",
          "Every refusal says which block it is, what the task is, and until when.",
        ],
        result: "Getting out of a block takes a deliberate choice, and the app always tells you where you stand.",
        shot: gallery("/projects/jagaday/emergency-exit.webp", "The emergency exit dialog counting down before a locked block can end", "The emergency exit, waiting out its delay. Sample data.", 1280, 900),
      },
      {
        id: "cores",
        title: "One set of rules, three languages",
        problem:
          "The rules run in Rust on Windows, in TypeScript in the app and the extension, and in Kotlin on Android. If they disagree, a site is blocked on one device and open on the other.",
        did: [
          "190 shared test cases that the Rust, TypeScript and Kotlin cores must all pass.",
          "An independent Python version of the rules, and a random cross-check between them.",
        ],
        result: "All three cores pass the same 190 cases, so one plan is enforced the same way everywhere.",
        shot: gallery("/projects/jagaday/stats.webp", "The weekly stats: planned against clocked minutes, early ends and turn-aways per day", "Weekly stats. Sample data.", 1280, 1131),
      },
    ],
  },
];

/** A project with a device render: it gets a home-grid card and the circle reveal. */
export type FeaturedProject = Project & Required<Pick<Project, "art" | "card" | "hero">>;

export const isFeatured = (p: Project): p is FeaturedProject => Boolean(p.art && p.card && p.hero);

export const featuredProjects = projects.filter(isFeatured);
export const moreProjects = projects.filter((p) => !isFeatured(p));

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const nextProject = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
};
