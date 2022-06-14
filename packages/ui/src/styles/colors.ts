import { ColorPaletteName } from "@withorbit/core";

export const ink = "rgba(0,0,0,0.8)";
export const white = "rgba(255,255,255,1)";
export const productKeyColor = "#ED3749";

export interface ColorPalette {
  backgroundColor: string;
  accentColor: string;
  secondaryAccentColor: string;
  secondaryBackgroundColor: string;
  secondaryTextColor: string;
}

// Colors expressed in HSL for better interpolation.
const _palettes = {
  red: {
    backgroundColor: "#F9F6F1",
    accentColor: "#D60909",
    secondaryAccentColor: "#897158",
    secondaryBackgroundColor: "#eeeae2",
    secondaryTextColor: "#897158",
  },
  orange: {
    backgroundColor: "#fa863d",
    accentColor: "#ffcb2e",
    secondaryAccentColor: "#fb372d",
    secondaryBackgroundColor: "#f4742f",
    secondaryTextColor: "#c74200",
  },
  brown: {
    backgroundColor: "#F9F6F1",
    accentColor: "#D28200",
    secondaryAccentColor: "#897158",
    secondaryBackgroundColor: "#eeeae2",
    secondaryTextColor: "#897158",
  },
  yellow: {
    backgroundColor: "#fac800",
    accentColor: "#f77102",
    secondaryAccentColor: "#f64441",
    secondaryBackgroundColor: "#f9bb01",
    secondaryTextColor: "#cc8500",
  },
  lime: {
    backgroundColor: "#8fd43a",
    accentColor: "#f6f613",
    secondaryAccentColor: "#01c171",
    secondaryBackgroundColor: "#7dcb25",
    secondaryTextColor: "#549509",
  },
  green: {
    backgroundColor: "#63d463",
    accentColor: "#f9e406",
    secondaryAccentColor: "#03bcdd",
    secondaryBackgroundColor: "#48cb51",
    secondaryTextColor: "#2b9732",
  },
  turquoise: {
    backgroundColor: "#52dada",
    accentColor: "#e8ec09",
    secondaryAccentColor: "#0199fe",
    secondaryBackgroundColor: "#1cced4",
    secondaryTextColor: "#04959a",
  },
  cyan: {
    backgroundColor: "#65c6f6",
    accentColor: "#c6f312",
    secondaryAccentColor: "#4defd4",
    secondaryBackgroundColor: "#50bbf1",
    secondaryTextColor: "hsl(200,89%,40%)",
  },
  blue: {
    backgroundColor: "#72aef8",
    accentColor: "#ffcb2e",
    secondaryAccentColor: "#15d5c9",
    secondaryBackgroundColor: "#60a1f0",
    secondaryTextColor: "#1d78e7",
  },
  violet: {
    backgroundColor: "#F9F6F1",
    accentColor: "#824FE8",
    secondaryAccentColor: "#897158",
    secondaryBackgroundColor: "#eeeae2",
    secondaryTextColor: "#897158",

  },
  purple: {
    backgroundColor: "#d071ef",
    accentColor: "#ffcb2e",
    secondaryAccentColor: "#df16b7",
    secondaryBackgroundColor: "#c95eed",
    secondaryTextColor: "#8714ad",
  },
  pink: {
    backgroundColor: "#f56bb5",
    accentColor: "#ffcb2e",
    secondaryAccentColor: "#c337e6",
    secondaryBackgroundColor: "#ec5fa8",
    secondaryTextColor: "#b7107d",
  },
};

const typedKeys = Object.keys as <T>(o: T) => Extract<keyof T, string>[];
export const orderedPaletteNames: ColorPaletteName[] = typedKeys(_palettes);
export const palettes: Record<ColorPaletteName, ColorPalette> = _palettes;
