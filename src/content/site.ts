/**
 * All copy, links and lists for the site live here.
 * Anything marked TODO is still placeholder content from the Figma file.
 */

export const site = {
  name: "Novel Bafagih",
  role: "Full-stack Developer",
  title: "Novel Bafagih — Freelance Full-stack Developer",
  description:
    "Freelance full-stack developer building fast, flexible web and mobile products with React, Next.js and Kotlin Jetpack Compose.",
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
  "I’m Novel Bafagih, a young text book front-end developer that have no days off without learning. Over the past few Years I have learn to create scalable, flexible yet robust software. Technologies that I use daily is React JS,  Kotlin Jetpack Compose, and Next JS. But give me a week, a computer and an internet connections and I will learn the technologies needed.";

export type Project = {
  /** Shown to screen readers and used as the hover label. */
  title: string;
  /** TODO: add case-study or live links; cards without one aren't clickable. */
  href?: string;
};

/** Order matches the Figma grid: top-left, top-right, bottom-left, bottom-right. */
export const projects: Project[] = [
  { title: "Proyek mobile app" },
  { title: "Girls in IT community website" },
  { title: "PetHub mobile app" },
  { title: "Patient information platform" },
];

export const coreValues = [
  { key: "fast", title: "Fast", body: "Most of my works is faster than the deadline timeline." },
  { key: "reliable", title: "Reliable", body: "You can always rely on me to put in a good work and effort." },
  { key: "flexible", title: "Flexible", body: "I can learn any technology is needed to create the best solution for the problem." },
  { key: "lowCost", title: "Low Cost", body: "Because I’m still a junior freelancer, hopefully my price meets with your budgets." },
  { key: "problemSolver", title: "Problem Solver", body: "Solving problem may not be easy, but I’m the person who thinks outside of the box." },
] as const;

/** TODO: placeholder testimonial from the Figma file. */
export const testimonials = [
  {
    quote:
      "When Working with novel it is very nice and I learn a lot about the things that I don’t know, I highly recommended working with novel",
    name: "Novel B.",
    relation: "Client",
    role: "Front End Developer at Google",
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
