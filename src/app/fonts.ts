import { Cabin, Inter } from "next/font/google";

/** The site's and the dashboard's fonts, each root layout puts their variables on <html>. */
export const cabin = Cabin({ variable: "--font-cabin", subsets: ["latin"] });
export const inter = Inter({ variable: "--font-inter-face", subsets: ["latin"] });
export const fontVariables = `${cabin.variable} ${inter.variable}`;
