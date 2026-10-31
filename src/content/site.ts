/**
 * All copy, links and lists for the site live here.
 * Anything marked TODO is still placeholder content from the Figma file.
 */

export const site = {
  name: "Novel Bafagih",
  role: "Software Engineer",
  title: "Novel Bafagih — Software Engineer",
  description:
    "Software engineer building web and Android products with React, Next.js and Kotlin Jetpack Compose. AI speeds up the work; every line is still reviewed, clean and maintainable.",
  location: "Based in Indonesia, Jakarta",
  timeZone: "Asia/Jakarta",
  email: "novelbafagih09@gmail.com",
  phone: "+62 8953 2807 9912",
  /** TODO: drop your CV at public/resume.pdf */
  resumeUrl: "/resume.pdf",
  /** TODO: fill in profile URLs. Empty strings render as plain (non-link) icons. */
  social: {
    github: "",
    linkedin: "",
    instagram: "",
    upwork: "",
  },
};

export const about =
  "I’m Novel Bafagih, a software engineer who never goes a day without learning something new. I build scalable, flexible and robust software, mostly with React, Next.js and Kotlin Jetpack Compose. AI is part of how I work: it helps me move fast, and I review every line so the code stays clean and easy to maintain. Give me a week, a computer and an internet connection, and I’ll learn whatever the project needs.";

/** "How I work" on the home page. The numbers in the last step are from the case studies. */
export const philosophy = {
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
  pledge: { lead: "What the AI builds is", mark: "what I build." },
  pledgeNote: "I read every line, I test it, and I answer for what ships.",
};

export type Testimonial = { quote: string; name: string; relation: string; role: string; avatar?: string };

/**
 * TODO: placeholders. The first is the Figma sample, the rest are dummy copy to show the deck;
 * replace them all with real testimonials before publishing. Cards without `avatar` show initials.
 */
export const testimonials: Testimonial[] = [
  {
    quote:
      "When Working with novel it is very nice and I learn a lot about the things that I don’t know, I highly recommended working with novel",
    name: "Novel B.",
    relation: "Client",
    role: "Front End Developer at Google",
    avatar: "/figma/testimonials/avatar.png",
  },
  {
    quote: "Placeholder: Novel turned our rough idea into a working web app in a few weeks and kept us in the loop the whole way.",
    name: "Client Name",
    relation: "Client",
    role: "Founder, Company",
  },
  {
    quote: "Placeholder: Clear communication, clean code, and he caught problems before they reached our users. Would hire again.",
    name: "Client Name",
    relation: "Client",
    role: "Product Manager, Company",
  },
  {
    quote: "Placeholder: Fast, reliable and easy to work with. The mobile app shipped on time and our team could pick it up right away.",
    name: "Teammate Name",
    relation: "Teammate",
    role: "Designer, Company",
  },
];

export type ExperienceItem = { title: string; org: string; detail?: string; period: string };

/** The Career page's three columns. From the LinkedIn profile and CV. */
export const experiences: { heading: string; items: ExperienceItem[] }[] = [
  {
    heading: "Professional",
    items: [
      { title: "Software Engineer", org: "Multimodal", detail: "New York, remote", period: "Apr 2024 – Present" },
      { title: "Frontend Web Developer", org: "OrthoCoPilot", detail: "Munich, remote", period: "Mar 2023 – Jun 2024" },
      { title: "Front-end Freelancer", org: "Upwork", period: "Jan 2023 – Mar 2024" },
      { title: "Frontend Developer", org: "Udana.id", detail: "Jakarta", period: "Nov 2021 – Mar 2022" },
    ],
  },
  {
    heading: "Education",
    items: [
      { title: "Bachelor's degree", org: "Universitas Brawijaya", detail: "Information Technology", period: "2020 – 2024" },
      { title: "Mobile Development (Android)", org: "Bangkit Academy by Google, Tokopedia, Gojek & Traveloka", detail: "Graduated with distinction, top 10%", period: "Feb – Jul 2023" },
      { title: "Software Engineer Academy", org: "COMPFEST", detail: "Best Participant, Favorite Team", period: "Aug 2021" },
    ],
  },
  {
    heading: "Leadership",
    items: [
      { title: "Team lead, capstone", org: "Bangkit Academy", detail: "A team of six to a working app in a month", period: "May – Jun 2023" },
      { title: "Chairman", org: "FEEL-IT, KBMTI", detail: "60 people across 8 divisions", period: "Apr – Nov 2022" },
      { title: "Head of Talent Development", org: "BCC, Universitas Brawijaya", period: "Apr 2021 – Aug 2023" },
    ],
  },
];

/**
 * Two ways to read the site, switched from the navbar. Freelance (the default) leads with projects
 * for clients; Full-time leads with the career for employers. Only the copy below changes.
 */
export const modes = {
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
} as const;

export type Mode = keyof typeof modes;

export type CareerRole = {
  period: string;
  role: string;
  org: string;
  place?: string;
  /** Only where the profile or CV says so. */
  kind?: "Full-time" | "Freelance" | "Program" | "Degree";
  points: string[];
  /** A case study this role is told through. */
  href?: string;
};

/** The home page's Career section, shown in Full-time mode. Newest first. */
export const career: CareerRole[] = [
  {
    period: "Apr 2024 – Present",
    role: "Software Engineer",
    org: "Multimodal",
    place: "New York, remote",
    kind: "Full-time",
    points: [
      "The first full-time frontend engineer: wrote the first commit of AgentFlow's frontend and merged 450+ pull requests.",
      "Moved multimodal.dev off Webflow; its median phone Lighthouse score went from 73 to 85.",
    ],
    href: "/projects/agentflow",
  },
  {
    period: "Mar 2023 – Jun 2024",
    role: "Frontend Web Developer",
    org: "OrthoCoPilot",
    place: "Munich, remote",
    points: ["Built TIA, a pilot with TUM for 500+ patients and their doctors, with 100+ branching medical questions."],
    href: "/projects/tia",
  },
  {
    period: "Jan 2023 – Mar 2024",
    role: "Front-end Freelancer",
    org: "Upwork",
    kind: "Freelance",
    points: ["Worked with 5+ clients around the world; half of them came back for more."],
  },
  {
    period: "Feb – Jul 2023",
    role: "Mobile Development (Android)",
    org: "Bangkit Academy",
    kind: "Program",
    points: ["Graduated with distinction, in the top 10%, and led a team of six to a working app in a month."],
    href: "/projects/breel",
  },
  {
    period: "Nov 2021 – Mar 2022",
    role: "Frontend Developer",
    org: "Udana.id",
    place: "Jakarta",
    points: ["Built the product website for a small fintech team that went on to OJK verification."],
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

export const services = ["Design", "Web", "Mobile", "Others"] as const;
export type Service = (typeof services)[number];

export const telHref = `tel:${site.phone.replace(/\s/g, "")}`;
export const mailHref = `mailto:${site.email}`;
