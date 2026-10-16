/** The reference's "What do you need?" chips, plus a cross-component preselect signal. */
export const NEEDS = ["Glassware", "Volumetric & measuring", "Heating & support", "Centrifuges & instruments", "Plastic labware", "Consumables", "A mixed list"] as const;

export const preselectNeed = (label: string) => document.dispatchEvent(new CustomEvent("quote:preselect", { detail: label }));
