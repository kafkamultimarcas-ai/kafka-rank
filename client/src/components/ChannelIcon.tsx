import React from "react";

/**
 * ChannelIcon - Displays the logo/icon of the lead source channel
 * Supports: WhatsApp, Instagram, Facebook, OLX, Webmotors, iCarros, SóCarrão,
 * Google Ads, ManyChat, Landing Page, Tráfego Pago, Indicação, Loja, Manual, API/Webhook
 */

interface ChannelIconProps {
  source: string;
  size?: number; // px, default 16
  className?: string;
  showLabel?: boolean;
}

// Channel configuration with colors and labels
const CHANNEL_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366", bgColor: "bg-green-500/15", textColor: "text-green-400" },
  whatsapp_ctwa: { label: "WhatsApp Ads", color: "#25D366", bgColor: "bg-green-500/15", textColor: "text-green-400" },
  instagram: { label: "Instagram", color: "#E4405F", bgColor: "bg-pink-500/15", textColor: "text-pink-400" },
  instagram_ads: { label: "Insta Ads", color: "#E4405F", bgColor: "bg-pink-500/15", textColor: "text-pink-400" },
  facebook: { label: "Facebook", color: "#1877F2", bgColor: "bg-blue-500/15", textColor: "text-blue-400" },
  facebook_ads: { label: "FB Ads", color: "#1877F2", bgColor: "bg-blue-500/15", textColor: "text-blue-400" },
  messenger: { label: "Messenger", color: "#00B2FF", bgColor: "bg-sky-500/15", textColor: "text-sky-400" },
  olx: { label: "OLX", color: "#FF6600", bgColor: "bg-orange-500/15", textColor: "text-orange-400" },
  webmotors: { label: "Webmotors", color: "#E31C25", bgColor: "bg-red-500/15", textColor: "text-red-400" },
  icarros: { label: "iCarros", color: "#FF3333", bgColor: "bg-red-500/15", textColor: "text-red-400" },
  socarrao: { label: "SóCarrão", color: "#FFD700", bgColor: "bg-yellow-500/15", textColor: "text-yellow-400" },
  google_ads: { label: "Google Ads", color: "#4285F4", bgColor: "bg-blue-500/15", textColor: "text-blue-400" },
  trafego_pago: { label: "Tráfego Pago", color: "#A855F7", bgColor: "bg-purple-500/15", textColor: "text-purple-400" },
  manychat: { label: "ManyChat", color: "#0084FF", bgColor: "bg-blue-400/15", textColor: "text-blue-300" },
  landing_page: { label: "Landing Page", color: "#6366F1", bgColor: "bg-indigo-500/15", textColor: "text-indigo-400" },
  indicacao: { label: "Indicação", color: "#06B6D4", bgColor: "bg-cyan-500/15", textColor: "text-cyan-400" },
  loja: { label: "Loja", color: "#F59E0B", bgColor: "bg-amber-500/15", textColor: "text-amber-400" },
  manual: { label: "Manual", color: "#9CA3AF", bgColor: "bg-gray-500/15", textColor: "text-gray-400" },
  webhook: { label: "API", color: "#8B5CF6", bgColor: "bg-violet-500/15", textColor: "text-violet-400" },
};

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.24l-.31-.18-2.87.85.85-2.87-.2-.31A7.96 7.96 0 014 12a8 8 0 1116 0 8 8 0 01-8 8z" fill="#25D366"/>
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#F77737"/>
          <stop offset="50%" stopColor="#E4405F"/>
          <stop offset="75%" stopColor="#C13584"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="#E4405F"/>
    </svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
    </svg>
  );
}

function MessengerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.145 2 11.5c0 3.06 1.45 5.788 3.72 7.564V22l3.4-1.867c.907.252 1.87.386 2.88.386 5.523 0 10-4.145 10-9.5S17.523 2 12 2z" fill="#00B2FF"/>
      <path d="M6.5 13.5l3.5-3.7 2.7 2.2 3.6-3.7-3.9 5.4-2.7-2.2-3.2 4z" fill="white"/>
    </svg>
  );
}

function OlxIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="3" fill="#FF6600"/>
      <text x="12" y="15.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">OLX</text>
    </svg>
  );
}

function WebmotorsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#1A1A2E"/>
      <text x="12" y="14" textAnchor="middle" fill="#E31C25" fontSize="5.5" fontWeight="bold" fontFamily="Arial, sans-serif">WM</text>
      <rect x="5" y="16" width="3" height="1" rx="0.5" fill="#E31C25"/>
      <rect x="16" y="16" width="3" height="1" rx="0.5" fill="#E31C25"/>
    </svg>
  );
}

function ICarrosIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#222"/>
      <text x="12" y="14.5" textAnchor="middle" fill="#FF3333" fontSize="6" fontWeight="bold" fontFamily="Arial, sans-serif">iC</text>
    </svg>
  );
}

function SoCarraoIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#1A1A2E"/>
      <text x="12" y="14.5" textAnchor="middle" fill="#FFD700" fontSize="5" fontWeight="bold" fontFamily="Arial, sans-serif">SC</text>
    </svg>
  );
}

function GoogleAdsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.272 16.102l5.09-8.836 3.464 2-5.09 8.836z" fill="#FBBC04"/>
      <path d="M15.638 7.266l5.09 8.836-3.464 2-5.09-8.836z" fill="#4285F4"/>
      <circle cx="6" cy="18" r="3" fill="#34A853"/>
    </svg>
  );
}

function ManyChatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="14" rx="4" fill="#0084FF"/>
      <path d="M7 20l3-4h-2" fill="#0084FF"/>
      <circle cx="8.5" cy="11" r="1.2" fill="white"/>
      <circle cx="12" cy="11" r="1.2" fill="white"/>
      <circle cx="15.5" cy="11" r="1.2" fill="white"/>
    </svg>
  );
}

function GenericChannelIcon({ source, size, color }: { source: string; size: number; color: string }) {
  const letter = (source || "?").charAt(0).toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1"/>
      <text x="12" y="16" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">{letter}</text>
    </svg>
  );
}

// Main component
export function ChannelIcon({ source, size = 16, className = "", showLabel = false }: ChannelIconProps) {
  const config = CHANNEL_CONFIG[source] || CHANNEL_CONFIG.manual;
  
  const iconMap: Record<string, React.ReactNode> = {
    whatsapp: <WhatsAppIcon size={size} />,
    whatsapp_ctwa: <WhatsAppIcon size={size} />,
    instagram: <InstagramIcon size={size} />,
    instagram_ads: <InstagramIcon size={size} />,
    facebook: <FacebookIcon size={size} />,
    facebook_ads: <FacebookIcon size={size} />,
    messenger: <MessengerIcon size={size} />,
    olx: <OlxIcon size={size} />,
    webmotors: <WebmotorsIcon size={size} />,
    icarros: <ICarrosIcon size={size} />,
    socarrao: <SoCarraoIcon size={size} />,
    google_ads: <GoogleAdsIcon size={size} />,
    manychat: <ManyChatIcon size={size} />,
  };

  const icon = iconMap[source] || <GenericChannelIcon source={source} size={size} color={config.color} />;

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        {icon}
        <span className={`text-[9px] font-medium ${config.textColor}`}>{config.label}</span>
      </span>
    );
  }

  return <span className={`inline-flex items-center shrink-0 ${className}`} title={config.label}>{icon}</span>;
}

// Badge version with background
export function ChannelBadge({ source, size = 14, className = "" }: ChannelIconProps) {
  const config = CHANNEL_CONFIG[source] || CHANNEL_CONFIG.manual;
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${config.bgColor} ${className}`}>
      <ChannelIcon source={source} size={size} />
      <span className={`text-[9px] font-medium ${config.textColor}`}>{config.label}</span>
    </span>
  );
}

// Small indicator for avatar overlay
export function ChannelIndicator({ source, size = 12 }: { source: string; size?: number }) {
  return (
    <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 shadow-sm">
      <ChannelIcon source={source} size={size} />
    </div>
  );
}

export { CHANNEL_CONFIG };
export default ChannelIcon;
