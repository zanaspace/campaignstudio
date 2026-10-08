// themes.js
// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined starter themes for the template builder. A theme bundles:
//   • a block layout (same block model as TemplateBuilder1Gov)
//   • starter subject + copy (editable after applying)
//   • a global font
//   • a category for grouping in the gallery
//
// The brand header + footer stay constant across themes. Applying a theme at
// template-creation seeds the draft; the user then edits the words.
//
// Notes carried over from the source HTML:
//   • Literal placeholders like {username}/{Anthonia Nya} → ${userName}
//   • Raleway headings → Poppins (only Poppins is loaded in the brand stack)
// ─────────────────────────────────────────────────────────────────────────────

const HEADER = { brand: "1Government Cloud", tagline: "Towards the Digitalization of the Public Service", logo: "https://res.cloudinary.com/dmwoafliu/image/upload/logo2019-1_sjmfo5" };
const FOOTER = { support: "http://support.1gov.ng", email: "1govecms@galaxybackbone.com.ng", align: "center" };
const POPPINS = { family: "'Poppins', sans-serif", size: 16, weight: 400 };

let _n = 0;
const bid = () => "tb_" + (++_n);
const block = (type, props) => ({ id: bid(), type, props });

export const THEME_CATEGORIES = {
  seasonal: "Seasonal greetings",
  notification: "Notifications",
  announcement: "Product announcements",
};

export const THEMES = [
  // ── Blank ──────────────────────────────────────────────────────────────────
  {
    id: "blank",
    name: "Blank template",
    category: null,
    description: "Start from an empty canvas with just the brand header and footer.",
    accent: "#055F36",
    subject: "",
    global: POPPINS,
    blocks: () => [
      block("header", { ...HEADER }),
      block("hero-title", { title: "Your headline here", align: "center" }),
      block("paragraph", { content: "Your message here.", align: "left" }),
      block("signoff", { closing: "Warm regards,", team: "The GBB 1Gov Team", align: "left" }),
      block("footer", { ...FOOTER }),
    ],
  },

  // ── Eid Mubarak ──────────────────────────────────────────────────────────────
  {
    id: "eid",
    name: "Eid Mubarak",
    category: "seasonal",
    description: "Warm Eid-el-Fitr greeting with seasonal hero artwork.",
    accent: "#1D9E75",
    subject: "Eid-el-Fitr Mubarak",
    global: POPPINS,
    blocks: () => [
      block("header", { ...HEADER }),
      block("hero-image", { src: "https://res.cloudinary.com/dmwoafliu/image/upload/Group_1707485175_znc2df", alt: "Eid-el-Fitr Mubarak", offset: 0, align: "center" }),
      block("salutation", { variable: "${userName}", align: "left" }),
      block("paragraph", { content: "As we mark the end of Ramadan, we extend our warm wishes to you and your family on this occasion of Eid al-Fitr.", align: "left" }),
      block("paragraph", { content: "May this season bring peace, renewed strength, and continued success in your service and contributions. We recognise and appreciate the important role your institution plays, and we remain committed to supporting your efforts with reliable and effective solutions.", align: "left" }),
      block("paragraph", { content: "Eid Mubarak", align: "left" }),
      block("signoff", { closing: "Warm regards,", team: "The GBB 1Gov Team", align: "left" }),
      block("footer", { ...FOOTER }),
    ],
  },

  // ── Easter Celebration ────────────────────────────────────────────────────────
  {
    id: "easter",
    name: "Easter Celebration",
    category: "seasonal",
    description: "Easter season greeting reflecting on renewal and service.",
    accent: "#7F77DD",
    subject: "Happy Easter",
    global: POPPINS,
    blocks: () => [
      block("header", { ...HEADER }),
      block("hero-image", { src: "https://res.cloudinary.com/dmwoafliu/image/upload/Group_1707485175_1_dl4ucp.png", alt: "Happy Easter", offset: 0, align: "center" }),
      block("salutation", { variable: "${userName}", align: "left" }),
      block("paragraph", { content: "As we commemorate this Easter season, we reflect on its enduring message of sacrifice and hope.", align: "left" }),
      block("paragraph", { content: "This period reminds us of the importance of dedication, resilience, and purposeful service — values that sit at the heart of what you do every day.", align: "left" }),
      block("paragraph", { content: "The work you do truly matters, and we remain committed to supporting it through solutions that enable efficiency and consistency in outcomes.", align: "left" }),
      block("paragraph", { content: "Wishing you and yours a joyous Easter.", align: "left" }),
      block("signoff", { closing: "Warm regards,", team: "The GBB 1Gov Team", align: "left" }),
      block("footer", { ...FOOTER }),
    ],
  },

  // ── Scheduled Maintenance ─────────────────────────────────────────────────────
  {
    id: "maintenance",
    name: "Scheduled Maintenance",
    category: "notification",
    description: "Operational notice for planned downtime — fill in the date and window.",
    accent: "#185FA5",
    subject: "Scheduled System Maintenance",
    global: POPPINS,
    blocks: () => [
      block("header", { ...HEADER }),
      block("hero-title", { title: "Scheduled System Maintenance", align: "center" }),
      block("hero-image", { src: "https://res.cloudinary.com/da0cpa9xa/image/upload/v1726344004/maintenance_ik7nhf.png", alt: "Scheduled maintenance", offset: 0, align: "center" }),
      block("salutation", { variable: "${userName}", align: "left" }),
      block("paragraph", { content: "As part of our ongoing efforts to enhance the functionality of our systems and better serve you, we will be conducting a scheduled system maintenance exercise on the 1Government Cloud platform on [DATE] from [START] to [END] WAT.", align: "left" }),
      block("paragraph", { content: "During this period, the applications on the 1Government Cloud platform may experience a temporary service disruption.", align: "left" }),
      block("paragraph", { content: "Upon completion, all services will be fully restored. We apologise for any inconvenience this may cause and appreciate your understanding.", align: "left" }),
      block("paragraph", { content: "Thank you.", align: "left" }),
      block("signoff", { closing: "Best regards,", team: "The 1Gov Cloud Team", align: "left" }),
      block("footer", { ...FOOTER }),
    ],
  },

  // ── Feature Update ────────────────────────────────────────────────────────────
  {
    id: "feature",
    name: "Feature Update",
    category: "announcement",
    description: "Announce a new product feature with a hero, highlights, steps and a call to action.",
    accent: "#639922",
    subject: "Introducing a new feature on GOV ECMS",
    global: POPPINS,
    blocks: () => [
      block("header", { ...HEADER }),
      block("hero-title", { title: "Introducing — The Memo feature on GOV ECMS 🎉", align: "center" }),
      block("hero-image", { src: "https://res.cloudinary.com/dmwoafliu/image/upload/v1777582486/Memo_Screen_1_fz01xx.png", alt: "GOV ECMS Memo feature", offset: 0, align: "center" }),
      block("salutation", { variable: "${userName}", align: "left" }),
      block("paragraph", { content: "We are thrilled to introduce Memo on GOV ECMS. Using a built-in text editor, it allows you to format content and manage official communications without leaving the platform. This feature enables MDAs to create official memos and documents directly within the ECMS application.", align: "left" }),
      block("subheading", { text: "How this feature makes your work better", align: "left" }),
      block("bullets", { items: [
        "Create and manage memos digitally: create, edit, share, and manage official memos all in one platform, eliminating manual processes and external tools.",
        "Seamless integration with tasks and approvals: attach memos to tasks to support structured workflow and approval processes.",
        "Draft, edit, and collaborate easily: save memos as drafts, refine content, and enable easy sharing and reviewer engagement within the system.",
        "Standardised, secure, and traceable records: ensure consistent formatting with pre-filled MDA details, centralised storage, easy retrieval, and a complete audit trail.",
        "Improved efficiency and paperless operations: accelerate memo preparation and approvals while supporting secure, transparent, and fully digital government communication.",
      ], align: "left" }),
      block("subheading", { text: "To get started, follow these five simple steps:", align: "left" }),
      block("bullets", { items: [
        "In the ECMS, navigate to the Memo feature, then click Create Memo.",
        "Type and format your memo using the editor tools provided.",
        "Click Save to continue later, Save As to finalise, or Invite Reviewer if needed.",
        "To view or edit saved memos, go to the Memo feature and select Draft or View All Memos.",
        "Click Submit Memo, then use the Create Task pop-up option or go to the Task module to attach the memo.",
      ], align: "left" }),
      block("cta", { label: "See how it works", url: "#", align: "center" }),
      block("paragraph", { content: "Thank you for choosing 1Gov. For further enquiries or to provide additional feedback, you may contact the 1Government Cloud Support Team.", align: "left" }),
      block("signoff", { closing: "Warm regards,", team: "The GBB 1Gov Team", align: "left" }),
      block("footer", { ...FOOTER }),
    ],
  },
];

// Build a fresh copy of a theme's blocks (fresh ids each time).
export function instantiateTheme(themeId) {
  const t = THEMES.find((x) => x.id === themeId) || THEMES[0];
  _n = 0; // reset so ids are stable per call
  return { subject: t.subject, blocks: t.blocks(), global: { ...t.global } };
}

export const themeById = (id) => THEMES.find((t) => t.id === id) || null;
