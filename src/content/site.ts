import type { SiteContent } from "@/lib/content/schema";

export type { CareerRole, Mode, Testimonial } from "@/lib/content/schema";

/**
 * The site's copy as it ships with the code. Pages read it through src/lib/content, where the dashboard
 * and agents edit it; once a version is published there, it wins over these.
 * Anything marked TODO is still placeholder content from the Figma file.
 */

/** Not content: the navbar clock and the dashboard's days run on Jakarta time. */
export const TIME_ZONE = "Asia/Jakarta";
/** The CV page; it tailors itself when the visitor came through a `?v=` link. */
export const RESUME_URL = "/cv";

export const site: SiteContent["site"] = {
  name: "Novel Bafagih",
  role: "Software Engineer",
  title: "Novel Bafagih | Software Engineer",
  description:
    "Software engineer building web and Android products with React, Next.js and Kotlin Jetpack Compose. AI speeds up the work; every line is still reviewed, clean and maintainable.",
  location: "Based in Indonesia, Jakarta",
  email: "novelbafagih09@gmail.com",
  /** Profile URLs. Empty strings render as plain (non-link) icons. */
  social: {
    github: "https://github.com/kucingapi",
    linkedin: "https://www.linkedin.com/in/novel-bafagih",
    instagram: "https://www.instagram.com/novelbafagih9/",
    upwork: "https://www.upwork.com/freelancers/~01d6f59045f1cbf573",
  },
};

export const about =
  "I’m Novel Bafagih, a software engineer who never goes a day without learning something new. I build scalable, flexible and robust software, mostly with React, Next.js and Kotlin Jetpack Compose. AI is part of how I work: it helps me move fast, and I review every line so the code stays clean and easy to maintain. Give me a week, a computer and an internet connection, and I’ll learn whatever the project needs.";

/** "How I work" on the home page. The numbers in the last step are from the case studies. */
export const philosophy: SiteContent["philosophy"] = {
  title: "How I work",
  lede: "AI is my tool, not my replacement. I take a product end to end, from the first sketch to the backend, and every step starts from facts, not hunches.",
  span: ["Design", "Frontend", "Backend", "Testing", "Analytics"],
  steps: [
    {
      title: "Start from the numbers",
      body: "Before I change anything, I find out how it is doing: what people click, how fast it loads, what breaks. A change needs a reason, and a baseline to beat.",
    },
    {
      title: "Plan before I build",
      body: "I write down what we are making, who it is for, and how we will know it worked. Mistakes are cheapest here, on paper.",
    },
    {
      title: "Make sure the AI knows exactly what I want",
      body: "The design, the rules, the edge cases and what done looks like go in first. The AI builds what I mean, not what it guesses.",
    },
    {
      title: "Build, test, iterate",
      body: "Then it moves fast: build, run the tests, look at the real screen, fix what is off, and go again until it holds up.",
    },
    {
      title: "Measure it again",
      body: "Every change ends with a before and after. multimodal.dev's median phone Lighthouse score went from 73 to 85; in AgentFlow, people filtering their runs went from about 10% to 70%.",
    },
  ],
  /** Read as one sentence; `mark` gets the highlight bar. */
  pledge: { lead: "What the AI builds is", mark: "my responsibility." },
  pledgeNote: "I test it, and I answer for what ships, not just a human proxy.",
};

/**
 * The first is real: quoted word for word from Dr. Ehmann's letter of recommendation (July 2023).
 * `mode` picks where each shows: Freelance mode, Full-time mode, or both.
 * TODO: the rest are placeholders; replace them with real testimonials before publishing. Cards
 * without `avatar` show initials.
 */
export const testimonials: SiteContent["testimonials"] = [
  {
    quote:
      "Mr. Bafagih played a pivotal role in developing a functioning prototype of a digital anamnesis solution, demonstrating great technical skills…",
    name: "Yannick Ehmann",
    relation: "Supervisor",
    role: "Physician, TUM Sports Orthopaedics",
    mode: "both",
  },
  {
    quote: "Placeholder: Novel turned our rough idea into a working web app in a few weeks and kept us in the loop the whole way.",
    name: "Client Name",
    relation: "Client",
    role: "Founder, Company",
    mode: "both",
  },
  {
    quote: "Placeholder: Clear communication, clean code, and he caught problems before they reached our users. Would hire again.",
    name: "Client Name",
    relation: "Client",
    role: "Product Manager, Company",
    mode: "both",
  },
  {
    quote: "Placeholder: Fast, reliable and easy to work with. The mobile app shipped on time and our team could pick it up right away.",
    name: "Teammate Name",
    relation: "Teammate",
    role: "Designer, Company",
    mode: "both",
  },
];

/**
 * Two ways to read the site, switched from the navbar. Freelance (the default) leads with projects
 * for clients; Full-time leads with the career for employers. Only the copy below changes.
 */
export const modes: SiteContent["modes"] = {
  freelance: {
    label: "Freelance",
    hero: { lead: "Looking for a", mark: "Freelance", rest: "Developer?" },
    chip: "For Projects",
    detail: {
      body: "Prefer to see where I have worked and what I have led? My career has it all, role by role.",
      href: "/career",
      cta: "See my career",
    },
    talk: {
      title: "Have a project in mind?",
      body: "Tell me what you need built, web or mobile, design to backend. I will come back with a plan.",
    },
  },
  fulltime: {
    label: "Full-time",
    hero: { lead: "Looking for a", mark: "Software", rest: "Engineer?" },
    chip: "To Work",
    detail: {
      body: "Every role has projects behind it. Read the case studies: the problem, what I did, and what changed.",
      href: "/projects",
      cta: "See my projects",
    },
    talk: {
      title: "Hiring a software engineer?",
      body: "I am open to full-time roles. Let’s talk about your team and the work.",
    },
  },
};

/** The home page's Career section, shown in Full-time mode. Newest first. */
export const career: SiteContent["career"] = [
  {
    period: "Apr 2024 – Oct 2026",
    role: "Software Engineer",
    org: "Multimodal",
    place: "New York, remote",
    kind: "Full-time",
    points: [
      "The first full-time frontend engineer: wrote the first commit of AgentFlow's frontend when it had no users. Two years on, more than a hundred client people use it every week.",
      "Moved multimodal.dev off Webflow; its median phone Lighthouse score went from 73 to 85.",
    ],
    href: "/projects/agentflow",
    cv: "multimodal",
  },
  {
    period: "Mar 2023 – Jun 2024",
    role: "Frontend Web Developer",
    org: "OrthoCoPilot",
    place: "Munich, remote",
    points: ["Built TIA, a pilot with TUM for 500+ patients and their doctors, with 100+ branching medical questions."],
    href: "/projects/tia",
    cv: "orthocopilot",
  },
  {
    period: "Jan 2023 – Mar 2024",
    role: "Front-end Freelancer",
    org: "Upwork",
    kind: "Freelance",
    points: ["Worked with 5+ clients around the world; half of them came back for more."],
    cv: "upwork",
  },
  {
    period: "Feb – Jul 2023",
    role: "Mobile Development (Android)",
    org: "Bangkit Academy",
    kind: "Program",
    points: ["Graduated with distinction, in the top 10%, and led a team of six to a working app in a month."],
    href: "/projects/breel",
    cv: "bangkit",
  },
  {
    period: "Nov 2021 – Mar 2022",
    role: "Frontend Developer",
    org: "Udana.id",
    place: "Jakarta",
    points: ["Built the product website for a small fintech team that went on to OJK verification."],
    cv: "udana",
  },
  {
    period: "2020 – 2024",
    role: "Bachelor's, Information Technology",
    org: "Universitas Brawijaya",
    kind: "Degree",
    points: ["Thesis: SIDAKU, an Android app and API for Kota Batu's small businesses."],
    href: "/projects/sidaku",
  },
];

/**
 * The Career page, in full: every role with what I did there. From the LinkedIn profile, the CV and
 * the case studies; numbers are as those sources give them.
 */
export const careerDetail: SiteContent["careerDetail"] = [
  {
    id: "work",
    heading: "Work",
    roles: [
      {
        period: "Apr 2024 – Oct 2026",
        role: "Software Engineer",
        org: "Multimodal",
        place: "New York, remote",
        kind: "Full-time",
        points: [
          "The first full-time frontend engineer. Wrote the first commit of AgentFlow's frontend in August 2024, when it had no users; by October 2026 more than a hundred client people used it every week, led by a bank that rolled it out to its lending teams.",
          "Built the document review tool for a US mortgage lender: annotation got 50% faster and the client's loan processing costs fell by 80%.",
          "Made the PDF viewer keep up with fast scrolling: CPU use went from 100% to 10%.",
          "Led the design system consolidation: 33 status-to-colour maps down to one, with a lint rule that keeps it that way.",
          "Moved multimodal.dev off Webflow to Next.js and Sanity; its median phone Lighthouse score went from 73 to 85.",
        ],
        href: "/projects/agentflow",
        cv: "multimodal",
      },
      {
        period: "Mar 2023 – Jun 2024",
        role: "Frontend Web Developer",
        org: "OrthoCoPilot",
        place: "Munich, remote",
        points: [
          "Led the pilot website for TIA with TUM Venture Labs and TUM Sports Orthopedics, connecting 500+ patients and 5+ doctors.",
          "Put the medical logic into code: 100+ questions and answers that branch on what the patient says.",
          "Built the backend on Supabase and PostgreSQL, working with the Master's and PhD students behind the research.",
        ],
        href: "/projects/tia",
        cv: "orthocopilot",
      },
      {
        period: "Jan 2023 – Mar 2024",
        role: "Front-end Freelancer",
        org: "Upwork",
        kind: "Freelance",
        points: [
          "Worked with 5+ clients around the world, fitting in with each one's project and way of working.",
          "Half of them came back for more work.",
        ],
        cv: "upwork",
      },
      {
        period: "Nov 2021 – Mar 2022",
        role: "Frontend Developer",
        org: "Udana.id",
        place: "Jakarta",
        points: [
          "Part of a small team that took the product through verification by OJK, Indonesia's Financial Services Authority.",
          "Built the 5+ page website that presents the main product.",
        ],
        cv: "udana",
      },
    ],
  },
  {
    id: "education",
    heading: "Education",
    roles: [
      {
        period: "2020 – 2024",
        role: "Bachelor's, Information Technology",
        org: "Universitas Brawijaya",
        place: "Malang",
        kind: "Degree",
        points: ["Thesis: SIDAKU, an Android app and REST API that let Kota Batu's cooperatives and small businesses keep their own records."],
        href: "/projects/sidaku",
      },
      {
        period: "Feb – Jul 2023",
        role: "Mobile Development (Android)",
        org: "Bangkit Academy",
        place: "Led by Google, Gojek, Tokopedia & Traveloka",
        kind: "Program",
        points: [
          "Graduated with distinction, in the top 10% of the cohort.",
          "Finished 7 Android courses on time, from the fundamentals to advanced techniques.",
        ],
        cv: "bangkit",
      },
      {
        period: "Aug 2021",
        role: "Software Engineer Academy",
        org: "COMPFEST",
        place: "Jakarta",
        kind: "Program",
        points: ["Won Best Participant and the Favorite Team award."],
        cv: "compfest",
      },
    ],
  },
  {
    id: "leadership",
    heading: "Leadership",
    roles: [
      {
        period: "May – Jun 2023",
        role: "Capstone team lead",
        org: "Bangkit Academy",
        points: ["Led a team of six across mobile, machine learning and cloud to a working app in a month: 100+ tasks closed in 30 days."],
        href: "/projects/breel",
      },
      {
        period: "Apr – Nov 2022",
        role: "Chairman",
        org: "FEEL-IT, KBMTI",
        place: "Malang",
        points: ["Steered a team of 60 across 8 divisions.", "Ran the organisation's first offline event in two years."],
      },
      {
        period: "Apr 2021 – Aug 2023",
        role: "Head of Talent Development",
        org: "BCC",
        place: "Malang",
        points: [
          "Organised BCC's first offline townhall; attendance rose by 50%.",
          "Created a learning event that drew 100+ attendees, 50% more than the year before.",
        ],
      },
    ],
  },
];

export const services = ["Design", "Web", "Mobile", "Others"] as const;
export type Service = (typeof services)[number];

export const mailto = (email: string) => `mailto:${email}`;
