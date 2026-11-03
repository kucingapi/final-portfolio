/**
 * The master CV: every role, project and line Novel can stand behind, longer than any one CV should be.
 * A variant (src/lib/cv/variant.ts) picks and orders from it to make a two-page CV for one application.
 *
 * Bullets lead with the result. Numbers come from the career record and the case studies; anything
 * remembered rather than measured says "about". `weight` is how strong a line is on its own
 * (3 = lead with it), and the default CV is built from the heaviest lines.
 */

export const CV_TAGS = [
  "frontend",
  "backend",
  "mobile",
  "desktop",
  "ai",
  "product",
  "design",
  "performance",
  "fintech",
  "health",
  "client",
  "leadership",
  "testing",
  "analytics",
] as const;
export type CvTag = (typeof CV_TAGS)[number];

export type CvBullet = { id: string; text: string; tags: CvTag[]; weight: 1 | 2 | 3 };

/** Leadership lives inside Education (the student organisations) and Awards, which keeps the CV compact. */
export const CV_SECTIONS = ["skills", "experience", "projects", "education", "awards"] as const;
export type CvSectionId = (typeof CV_SECTIONS)[number];
export type CvEntrySection = Exclude<CvSectionId, "skills">;

export const SECTION_TITLES: Record<CvSectionId, string> = {
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  awards: "Awards and Certifications",
  skills: "Skills",
};

export type CvEntry = {
  id: string;
  section: CvEntrySection;
  org: string;
  place?: string;
  /** Titles this role can honestly go by; the first is the default. */
  titles: string[];
  period: string;
  /** A short qualifier after the title, e.g. "Freelance" or "In progress". */
  note?: string;
  /** Case study on the site. */
  link?: string;
  /** The certificate behind it, as an image on the site (public/certificates). */
  proof?: string;
  /** One line on what the organisation is, for a name the reader won't know. */
  about?: string;
  /** What it was built with, most telling first; shown as a "Tech:" line under the bullets. */
  stack?: string[];
  tags: CvTag[];
  /** How strong the entry is overall; the default CV leaves out the lightest. */
  weight: 1 | 2 | 3;
  /** Most bullets the default CV shows, when this entry needs other than its section's cap. */
  bulletCap?: number;
  bullets: CvBullet[];
};

/** Four bullets is the most an entry should carry; five only for a lead role where every line is strong. */
export const MAX_BULLETS = 5;

export type CvSkillGroup = { id: string; label: string; items: string[] };

export const cvHeader = {
  name: "Novel Bafagih",
  /** Headlines a variant may choose from, or it may write its own. */
  headlines: ["Software Engineer", "Frontend Engineer", "Full-stack Engineer", "Frontend Engineer, AI products"],
  location: "Jakarta, Indonesia",
  email: "novelbafagih09@gmail.com",
  /** The portfolio site, shown beside the email; it stays when a variant hides the contact details. */
  site: { label: "novelbafagih.com", href: "https://www.novelbafagih.com" },
  links: [
    { label: "linkedin.com/in/novel-bafagih", href: "https://www.linkedin.com/in/novel-bafagih" },
    { label: "github.com/kucingapi", href: "https://github.com/kucingapi" },
  ],
};

/** Summaries a variant may start from. */
export const cvSummaries: { id: string; text: string; tags: CvTag[] }[] = [
  {
    id: "founding-fe",
    text: "Software engineer who builds products end to end, from design to backend. Founding frontend engineer on AgentFlow, an AI document platform for banks and credit unions, which I took from its first commit to more than a hundred client users a week. I use AI coding agents to move fast, and I test and own everything that ships.",
    tags: ["frontend", "ai", "product", "fintech"],
  },
  {
    id: "impact",
    text: "Engineer who measures before and after: cut a lender's loan processing costs by 80%, a PDF viewer's CPU use from 100% to 10%, and a payroll team's tax prep from days to minutes. Five years of React and Next.js products for clients in the US, Germany and Indonesia.",
    tags: ["frontend", "performance", "client"],
  },
  {
    id: "fullstack",
    text: "Full-stack engineer comfortable across web, Android and desktop: Next.js and React on the front, Python, Supabase and PostgreSQL behind it, Kotlin on phones and Tauri on the desktop. I plan first, brief AI tools precisely, then build, test and measure.",
    tags: ["backend", "mobile", "desktop"],
  },
];

export const cvEntries: CvEntry[] = [
  {
    id: "multimodal",
    section: "experience",
    org: "Multimodal",
    place: "New York, United States (remote)",
    titles: ["Software Engineer", "Frontend Engineer", "Founding Frontend Engineer"],
    period: "Apr 2024 – Oct 2026",
    link: "/projects/agentflow",
    stack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Storybook", "TanStack Query", "Python", "FastAPI", "Sanity", "PostHog", "Playwright"],
    tags: ["frontend", "ai", "fintech", "product"],
    weight: 3,
    bulletCap: 5,
    bullets: [
      {
        id: "af-founding",
        text: "Founding frontend engineer on AgentFlow, an AI platform that takes business documents from upload to decision for banks and credit unions: wrote its first frontend commit and built its core screens as it grew from zero to more than a hundred client users every week.",
        tags: ["frontend", "product", "fintech", "ai"],
        weight: 3,
      },
      {
        id: "mortgage",
        text: "Cut a US mortgage lender's loan processing costs by 80% by building the document annotation tool its team checks the AI's work in, making annotation 50% faster.",
        tags: ["frontend", "fintech", "ai", "client"],
        weight: 3,
      },
      {
        id: "pdf-cpu",
        text: "Cut CPU use from 100% to 10% when scrolling fast through long PDFs, keeping the document viewer smooth for reviewers who live in it all day.",
        tags: ["frontend", "performance"],
        weight: 3,
      },
      {
        id: "website",
        text: "Migrated multimodal.dev from Webflow to Next.js and Sanity with no lost pages or broken sign-ups, then raised its median mobile Lighthouse score from 73 to 85 and made pages about 40% lighter.",
        tags: ["frontend", "performance"],
        weight: 3,
      },
      {
        id: "design-system",
        text: "Led the design-system consolidation across the app: replaced hundreds of one-off colours, sizes and status styles (33 status-to-colour maps down to one) with shared tokens and components, guarded by a lint rule that blocks new one-offs.",
        tags: ["frontend", "design"],
        weight: 2,
      },
      {
        id: "filters",
        text: "Rebuilt search, filtering and sorting around one shared filter bar and instant client-side search; filter use rose from about 10% to about 70% of users.",
        tags: ["frontend", "product", "performance"],
        weight: 2,
      },
      {
        id: "ai-names",
        text: "Shipped AI-written run names and summaries drawn from each document's contents, fixing the top complaint in client interviews: finding the right application or invoice at a glance.",
        tags: ["ai", "product", "frontend"],
        weight: 2,
      },
      {
        id: "usage",
        text: "Built the Usage dashboard and credit-limit warnings, so client admins see usage, plan and remaining credits, and runs stop before a client overspends.",
        tags: ["frontend", "product", "fintech"],
        weight: 2,
      },
      {
        id: "workbench",
        text: "Delivered a client review workbench in six days to keep a prospect from choosing a competitor; the client tested it on schedule.",
        tags: ["frontend", "client"],
        weight: 2,
      },
      {
        id: "analytics",
        text: "Defined the product analytics for every main page in PostHog and used it to steer design: data showing 84% of document opens start from the Runs table turned the Home redesign into a doorway to each workflow.",
        tags: ["analytics", "product"],
        weight: 2,
      },
      {
        id: "ai-tooling",
        text: "Raised the team's engineering bar with AI tooling: ran parallel AI coding agents behind review checks, wrote reusable workflows for code review, releases and bug triage, and was one of the team's main frontend reviewers.",
        tags: ["ai", "leadership", "testing"],
        weight: 2,
      },
      {
        id: "backend",
        text: "Wrote the Python/FastAPI backend work a feature needed instead of waiting on it, shipping features end to end.",
        tags: ["backend"],
        weight: 1,
      },
      {
        id: "sanity-handbook",
        text: "Set marketing up to edit the website in Sanity without an engineer, with a handbook they run it from.",
        tags: ["product"],
        weight: 1,
      },
      {
        id: "demo-env",
        text: "Built the demo environment Multimodal uses to show its AI products to prospective clients.",
        tags: ["client", "ai"],
        weight: 1,
      },
    ],
  },
  {
    id: "orthocopilot",
    section: "experience",
    org: "OrthoCoPilot, by TUM Venture Labs",
    place: "Munich, Germany (remote)",
    titles: ["Web Developer", "Frontend Engineer", "Full-stack Developer"],
    period: "Mar 2023 – Jun 2024",
    link: "/projects/tia",
    about: "A digital-health startup from the Technical University of Munich (TUM), building tools for orthopaedic patients and doctors.",
    stack: ["React", "JavaScript", "Material UI", "Supabase", "PostgreSQL", "Figma"],
    tags: ["frontend", "backend", "health"],
    weight: 3,
    bullets: [
      {
        id: "tia-pilot",
        text: "Led development of TIA, a pilot web app with TUM Venture Labs and TUM Sports Orthopedics that connected 500+ patients with their doctors before consultations.",
        tags: ["frontend", "health", "product"],
        weight: 3,
      },
      {
        id: "tia-logic",
        text: "Encoded 100+ branching medical questions into the app, so each patient's questionnaire adapts to their answers and the doctor gets a readable summary.",
        tags: ["frontend", "health"],
        weight: 2,
      },
      {
        id: "tia-backend",
        text: "Designed and built the backend on Supabase and PostgreSQL.",
        tags: ["backend"],
        weight: 2,
      },
      {
        id: "tia-research",
        text: "Worked with the Master's and PhD researchers behind the study to turn their research into the first product prototype.",
        tags: ["health", "product"],
        weight: 1,
      },
    ],
  },
  {
    id: "upwork",
    section: "experience",
    org: "Upwork",
    place: "Remote",
    titles: ["Frontend Engineer", "Software Engineer", "Full-stack Developer"],
    note: "Freelance",
    period: "Jan 2023 – Mar 2024",
    stack: ["React", "Next.js", "JavaScript", "OpenAI API", "Google Cloud Run"],
    tags: ["frontend", "client", "ai"],
    weight: 2,
    bullets: [
      {
        id: "upwork-clients",
        text: "Delivered web projects for 5+ clients in several countries; half of them came back for repeat work.",
        tags: ["client", "frontend"],
        weight: 3,
      },
      {
        id: "upwork-ignite",
        text: "Built a Next.js web app on the OpenAI API for Ignite Compliance, a US client, deployed it to Google Cloud Run from GitHub, and fixed the payment issues that blocked its users.",
        tags: ["frontend", "ai", "client"],
        weight: 2,
      },
      {
        id: "upwork-remote",
        text: "Worked fully remote across time zones, fitting each client's stack, timeline and way of working.",
        tags: ["client"],
        weight: 1,
      },
    ],
  },
  {
    id: "udana",
    section: "experience",
    org: "Udana.id",
    place: "Jakarta, Indonesia",
    titles: ["Frontend Developer"],
    period: "Nov 2021 – Mar 2022",
    stack: ["AngularJS", "JavaScript", "HTML", "CSS"],
    tags: ["frontend", "fintech"],
    weight: 2,
    bullets: [
      {
        id: "udana-ojk",
        text: "Part of the small team that took a fintech product through verification by OJK, Indonesia's Financial Services Authority.",
        tags: ["fintech"],
        weight: 2,
      },
      {
        id: "udana-site",
        text: "Built the 5+ page responsive website that presents the product in AngularJS, from its main pages to the interface components they share.",
        tags: ["frontend"],
        weight: 2,
      },
    ],
  },
  {
    id: "payroll",
    section: "projects",
    org: "Payroll Formatter",
    titles: ["Freelance developer"],
    note: "Client project",
    period: "Mar 2025",
    link: "/projects/payroll-formatter",
    stack: ["Python", "Tkinter", "MS Access", "pyodbc", "openpyxl", "PyInstaller"],
    tags: ["desktop", "client", "backend"],
    weight: 3,
    bullets: [
      {
        id: "payroll-time",
        text: "Cut a company group's tax-upload preparation from 2–3 days of manual database lookups across its sub-companies to minutes, with a Windows tool that reads the legacy Access payroll and writes Indonesia's e-Bupot files.",
        tags: ["desktop", "client", "backend"],
        weight: 3,
      },
      {
        id: "payroll-cost",
        text: "Cost the client 99% less than a year on the vendor's replacement platform, and the client owns the code.",
        tags: ["client"],
        weight: 3,
      },
    ],
  },
  {
    id: "raya",
    section: "projects",
    org: "Raya Airways cargo portal",
    place: "Through Belli",
    titles: ["Frontend Engineer"],
    note: "Contract",
    period: "Apr – May 2025",
    link: "/projects/raya-airways",
    stack: ["Next.js", "TypeScript", "shadcn/ui", "TanStack Table", "React Hook Form", "Clerk"],
    tags: ["frontend", "client"],
    weight: 2,
    bullets: [
      {
        id: "raya-schedule",
        text: "Built the flight schedule customers book cargo from, on Belli's white-label air-cargo platform, and tightened the booking form.",
        tags: ["frontend", "client"],
        weight: 2,
      },
      {
        id: "raya-cleanup",
        text: "Removed 2,280 lines of unused code while doing it.",
        tags: ["frontend"],
        weight: 1,
      },
    ],
  },
  {
    id: "bank-sampah",
    section: "projects",
    org: "Bank Sampah",
    titles: ["Designer and developer"],
    note: "Side project",
    period: "Mar – Sep 2026",
    link: "/projects/bank-sampah",
    stack: ["Tauri", "Rust", "React", "TypeScript", "SQLite", "Tailwind CSS"],
    tags: ["desktop", "product", "design"],
    weight: 3,
    bullets: [
      {
        id: "bs-payout",
        text: "Designed and built the offline desktop app a neighbourhood waste bank runs on, cutting its twice-yearly payout from weeks of going page by page through spreadsheets, with prices changing every collection, to seconds.",
        tags: ["desktop", "product"],
        weight: 3,
      },
      {
        id: "bs-impact",
        text: "7.4+ tonnes of waste weighed in through it from 152 residents so far.",
        tags: ["desktop", "product"],
        weight: 2,
      },
      {
        id: "bs-stack",
        text: "Fast enough to keep pace with a queue of residents at the scale, and updates itself with signed releases.",
        tags: ["desktop"],
        weight: 1,
      },
    ],
  },
  {
    id: "pethub",
    section: "projects",
    org: "Pethub",
    titles: ["Android developer"],
    note: "Freelance",
    period: "Nov 2023",
    stack: ["Kotlin", "Android", "MVVM", "Hilt", "Retrofit"],
    tags: ["mobile", "client"],
    weight: 2,
    bullets: [
      {
        id: "pethub-play",
        text: "Shipped Pethub's Android app, 10+ screens, to Google Play, after restructuring its code to MVVM with Hilt and Retrofit.",
        tags: ["mobile", "client"],
        weight: 2,
      },
    ],
  },
  {
    id: "seru-room",
    section: "projects",
    org: "Seru Room",
    titles: ["Designer and developer"],
    note: "In progress",
    period: "Sep 2026 – Present",
    link: "/projects/seru-room",
    stack: ["Next.js", "TypeScript", "Cloudflare Durable Objects", "WebSocket", "Turso", "Drizzle", "Playwright"],
    tags: ["frontend", "backend", "product"],
    weight: 1,
    bullets: [
      {
        id: "seru-what",
        text: "A live presentation app where an audience joins with a six-digit code and answers polls, word clouds, rankings and Q&A in real time, covered by end-to-end tests.",
        tags: ["frontend", "backend"],
        weight: 2,
      },
    ],
  },
  {
    id: "jagaday",
    section: "projects",
    org: "JagaDay",
    titles: ["Designer and developer"],
    note: "In progress",
    period: "Oct 2026 – Present",
    link: "/projects/jagaday",
    stack: ["Rust", "Tauri", "React", "Kotlin", "Jetpack Compose", "Supabase"],
    tags: ["desktop", "mobile", "backend"],
    weight: 1,
    bullets: [
      {
        id: "jaga-what",
        text: "A calendar-driven focus blocker that guards Windows and Android at once, with 190 shared test cases its three rule engines must all pass.",
        tags: ["desktop", "mobile", "testing"],
        weight: 2,
      },
    ],
  },
  {
    id: "sidaku",
    section: "projects",
    org: "SIDAKU",
    titles: ["Android and API developer"],
    note: "Thesis",
    period: "Sep 2023 – Jul 2024",
    link: "/projects/sidaku",
    stack: ["Kotlin", "Jetpack Compose", "Retrofit", "Django REST Framework", "PostgreSQL", "Docker", "Cloud Run"],
    tags: ["mobile", "backend"],
    weight: 2,
    bullets: [
      {
        id: "sidaku-what",
        text: "Built an Android app and REST API that let Kota Batu's small businesses register with the city's business-service centre and keep 12 kinds of their own records.",
        tags: ["mobile", "backend"],
        weight: 2,
      },
    ],
  },
  {
    id: "brawijaya",
    section: "education",
    org: "Universitas Brawijaya",
    place: "Malang, Indonesia",
    titles: ["Bachelor of Computer Science, Information Technology"],
    period: "2020 – 2024",
    tags: [],
    weight: 3,
    bullets: [
      {
        id: "ub-feelit",
        text: "Chairman of FEEL-IT (2022), the orientation that KBMTI, the IT students' association, runs for 150+ new students: led a team of 60 across 8 divisions and brought it back offline for the first time in two years.",
        tags: ["leadership"],
        weight: 2,
      },
      {
        id: "ub-bcc",
        text: "Head of Talent Development at BCC, the faculty's student tech community (2021 – 2023): set up its software house, which won the community's first paid project, and ran its first offline townhall, with attendance up 50%.",
        tags: ["leadership", "client"],
        weight: 2,
      },
      {
        id: "ub-bcc-event",
        text: "Created a BCC learning event that drew 100+ attendees, 50% more than the year before.",
        tags: ["leadership"],
        weight: 1,
      },
    ],
  },
  {
    id: "bangkit",
    section: "education",
    org: "Bangkit Academy, led by Google, Gojek, Tokopedia and Traveloka",
    titles: ["Mobile Development (Android) cohort"],
    period: "Feb – Jul 2023",
    proof: "/certificates/bangkit-2023-distinction.webp",
    link: "/projects/breel",
    tags: ["mobile"],
    weight: 2,
    bullets: [
      {
        id: "bangkit-distinction",
        text: "Graduated with distinction, in the top 10% of the cohort.",
        tags: ["mobile"],
        weight: 2,
      },
      {
        id: "bangkit-lead",
        text: "Led the capstone team of six across mobile, machine learning and cloud to a working Android app in a month, closing 100+ tasks in 30 days.",
        tags: ["leadership", "mobile"],
        weight: 2,
      },
      {
        id: "bangkit-scores",
        text: "Averaged 91.5 out of 100 across 914 hours of Kotlin, Android, Jetpack Compose and UX courses, after being one of 5,013 students picked from more than 67,000 applicants.",
        tags: ["mobile"],
        weight: 1,
      },
    ],
  },
  {
    id: "compfest",
    section: "education",
    org: "COMPFEST Software Engineering Academy",
    place: "Jakarta, Indonesia",
    titles: ["Participant"],
    period: "Aug 2021",
    proof: "/certificates/compfest-13-best-participant.webp",
    tags: [],
    weight: 1,
    bullets: [
      {
        id: "compfest-award",
        text: "Won Best Participant and the Favorite Team award.",
        tags: [],
        weight: 1,
      },
    ],
  },
  {
    id: "infest",
    section: "awards",
    org: "Informatics Festival 2022, Universitas Padjadjaran",
    titles: ["3rd place, Innovative Technology Competition"],
    period: "Sep 2022",
    proof: "/certificates/infest-2022-third-place.webp",
    tags: ["product"],
    weight: 2,
    bullets: [],
  },
  {
    id: "tvi-mentor",
    section: "awards",
    org: "Tech Voice Indonesia, Tech Week 2025",
    titles: ["Mentor, Software Engineering Introduction course"],
    period: "Jun 2025",
    proof: "/certificates/tech-voice-indonesia-mentor.webp",
    tags: ["leadership"],
    weight: 1,
    bullets: [],
  },
  {
    id: "fcc-js",
    section: "awards",
    org: "freeCodeCamp",
    titles: ["JavaScript Algorithms and Data Structures certification"],
    period: "May 2021",
    proof: "/certificates/freecodecamp-javascript.webp",
    tags: ["frontend"],
    weight: 1,
    bullets: [],
  },
  {
    id: "fcc-web",
    section: "awards",
    org: "freeCodeCamp",
    titles: ["Responsive Web Design certification"],
    period: "Apr 2021",
    proof: "/certificates/freecodecamp-responsive-web.webp",
    tags: ["frontend"],
    weight: 1,
    bullets: [],
  },
];

export const cvSkills: CvSkillGroup[] = [
  { id: "languages", label: "Languages", items: ["TypeScript", "JavaScript", "Python", "Kotlin", "Rust", "SQL", "Java", "PHP"] },
  { id: "frontend", label: "Frontend", items: ["React", "Next.js", "Tailwind CSS", "Storybook", "Vue", "Angular", "HTML", "CSS"] },
  { id: "backend", label: "Backend and data", items: ["FastAPI", "Supabase", "PostgreSQL", "SQLite", "Django REST Framework", "Sanity", "Turso"] },
  { id: "mobile-desktop", label: "Mobile and desktop", items: ["Android", "Jetpack Compose", "Tauri"] },
  { id: "ai", label: "AI", items: ["LLM product features", "AI coding agents", "MCP"] },
  { id: "tools", label: "Tools", items: ["Git", "Playwright", "PostHog", "Figma", "Vercel", "Docker", "Google Cloud"] },
];

export const getCvEntry = (id: string) => cvEntries.find((e) => e.id === id);
