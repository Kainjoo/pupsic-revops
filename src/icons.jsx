// Lightweight inline icon set (subset of lucide style, original SVG)
const Icon = ({ children, size = 16, className, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       className={className} aria-hidden="true">
    {children}
  </svg>
);

const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></Icon>;
const IconArrowLeft  = (p) => <Icon {...p}><path d="M19 12H5" /><path d="m11 19-7-7 7-7" /></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="m5 12 5 5L20 7" /></Icon>;
const IconX = (p) => <Icon {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>;
const IconLock = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
const IconStar = (p) => <Icon {...p}><path d="M12 3.5l2.6 5.4 5.9.6-4.5 4.1 1.4 5.8L12 16.7l-5.4 2.7 1.4-5.8L3.5 9.5l5.9-.6L12 3.5z" /></Icon>;
const IconSpark = (p) => <Icon {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.4 6.4l2.8 2.8M14.8 14.8l2.8 2.8M17.6 6.4l-2.8 2.8M9.2 14.8 6.4 17.6" /></Icon>;
const IconTrending = (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Icon>;
const IconTrendingDown = (p) => <Icon {...p}><path d="M3 7l6 6 4-4 8 8" /><path d="M14 17h7v-7" /></Icon>;
const IconCoins = (p) => <Icon {...p}><circle cx="9" cy="9" r="5" /><path d="M16.5 5.5A5 5 0 1 1 19 14.5" /><path d="M14.5 16.5A5 5 0 1 1 19 14.5" /></Icon>;
const IconCalculator = (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><rect x="8" y="6" width="8" height="3" /><circle cx="9" cy="13" r=".5" fill="currentColor"/><circle cx="12" cy="13" r=".5" fill="currentColor"/><circle cx="15" cy="13" r=".5" fill="currentColor"/><circle cx="9" cy="17" r=".5" fill="currentColor"/><circle cx="12" cy="17" r=".5" fill="currentColor"/><circle cx="15" cy="17" r=".5" fill="currentColor"/></Icon>;
const IconChart = (p) => <Icon {...p}><path d="M4 4v16h16" /><rect x="8" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></Icon>;
const IconGrid = (p) => <Icon {...p}><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></Icon>;
const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
const IconLogout = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>;
const IconSave = (p) => <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></Icon>;
const IconUpload = (p) => <Icon {...p}><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></Icon>;
const IconWand = (p) => <Icon {...p}><path d="m15 4 5 5" /><path d="M14.5 4.5 4 15v5h5L19.5 9.5" /><path d="M9 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>;
const IconCard = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 10h18" /><path d="M7 15h3" /></Icon>;
const IconUsers = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0" /><circle cx="17" cy="7" r="2.5" /><path d="M16 14a6 6 0 0 1 6 6" /></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /></Icon>;
const IconFolder = (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></Icon>;
const IconLink = (p) => <Icon {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const IconLeak = (p) => <Icon {...p}><path d="M4 4h6v6" /><path d="M4 4l8 8" /><path d="M14 14a6 6 0 1 0 6-6" /></Icon>;
const IconChevron = (p) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Icon>;

Object.assign(window, {
  IconArrowRight, IconArrowLeft, IconCheck, IconX, IconLock, IconStar, IconSpark,
  IconTrending, IconTrendingDown, IconCoins, IconCalculator, IconChart, IconGrid,
  IconUser, IconLogout, IconSave, IconPlus, IconDownload, IconUpload, IconWand,
  IconSettings, IconCard, IconUsers, IconCalendar, IconFolder, IconLink, IconClock, IconLeak, IconChevron, IconCheckCircle,
});
