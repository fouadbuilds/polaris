export const SEASONS = [
  {
    month: "march",
    label: "March",
    number: "03",
    stage: "Winter maximum",
    window: "Winter · ice builds toward March",
    description:
      "Arctic-wide ice extent usually peaks in March. This snapshot shows late-winter coverage; individual Canadian waters peak at different times.",
  },
  {
    month: "july",
    label: "July",
    number: "07",
    stage: "Summer retreat",
    window: "June–August · retreating ice",
    description:
      "July is partway through the melt season, not the ice minimum. Many channels still contain ice. White marks at least 15% monthly ice concentration, so it can include substantial open water between floes.",
  },
  {
    month: "september",
    label: "September",
    number: "09",
    stage: "Late-summer minimum",
    window: "Late Summer · typically September",
    description:
      "Arctic-wide ice extent usually reaches its minimum in September. Compare this key late-season shipping snapshot across years; minimum ice does not mean every route is clear.",
  },
  {
    month: "october",
    label: "October",
    number: "10",
    stage: "Early freeze-up",
    window: "Autumn · ice begins returning",
    description:
      "October samples autumn ice growth. Freeze-up can begin in September in northern waters and extend into December elsewhere.",
  },
] as const;
export type IceMonth = (typeof SEASONS)[number]["month"];
