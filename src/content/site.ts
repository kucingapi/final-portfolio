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

export const coreValues = [
  { key: "fast", title: "Fast", body: "Most of my work lands before the deadline, not on it." },
  { key: "reliable", title: "Reliable", body: "You can count on me to put real care and effort into every piece of work." },
  { key: "flexible", title: "Flexible", body: "I pick up whatever technology the problem needs to build the best solution." },
  { key: "aiAssisted", title: "AI-Assisted, Human-Reviewed", body: "AI helps me ship faster. I still read, test and own every line, so the code stays clean and easy to maintain." },
  { key: "problemSolver", title: "Problem Solver", body: "Hard problems don’t scare me. I look past the obvious answer to find one that actually works." },
] as const;

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
