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

/** TODO: the three columns are identical placeholders in Figma. */
export const experiences: { heading: string; items: ExperienceItem[] }[] = [
  {
    heading: "Education",
    items: [
      { title: "Bachelor Degree", org: "University of Brawijaya", detail: "Information of Technology", period: "2020 - 2024" },
      { title: "Android Developer", org: "Bangkit Academy led by Google, Tokopedia, Gojek, & Traveloka", period: "Feb 2023 - Jul 2023" },
    ],
  },
  {
    heading: "Leadership",
    items: [
      { title: "Bachelor Degree", org: "University of Brawijaya", detail: "Information of Technology", period: "2020 - 2024" },
      { title: "Android Developer", org: "Bangkit Academy led by Google, Tokopedia, Gojek, & Traveloka", period: "Feb 2023 - Jul 2023" },
    ],
  },
  {
    heading: "Professional",
    items: [
      { title: "Bachelor Degree", org: "University of Brawijaya", detail: "Information of Technology", period: "2020 - 2024" },
      { title: "Android Developer", org: "Bangkit Academy led by Google, Tokopedia, Gojek, & Traveloka", period: "Feb 2023 - Jul 2023" },
    ],
  },
];

export const services = ["Design", "Web", "Mobile", "Others"] as const;
export type Service = (typeof services)[number];

export const telHref = `tel:${site.phone.replace(/\s/g, "")}`;
export const mailHref = `mailto:${site.email}`;
