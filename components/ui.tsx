"use client";
import React from "react";

export const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`rounded-2xl border border-line bg-surface ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""} ${className}`}>
    {children}
  </div>
);

type BtnVariant = "primary" | "ghost" | "subtle" | "danger" | "good";
export const Btn = ({ children, onClick, variant = "primary", className = "", disabled, small, type }: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; disabled?: boolean; small?: boolean; type?: "button" | "submit";
}) => {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${small ? "px-3 py-1.5 text-sm" : "px-5 py-3 text-[15px]"}`;
  const variants: Record<BtnVariant, string> = {
    primary: "text-bg bg-gradient-to-br from-accent to-accent2",
    ghost: "text-muted border border-line",
    subtle: "bg-raised text-ink",
    danger: "text-rose border border-line",
    good: "bg-sage text-bg",
  };
  return <button type={type || "button"} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

export const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "good" | "warn" | "rose" }) => {
  const tones = {
    default: "bg-raised text-muted",
    accent: "bg-accent/10 text-accent",
    good: "bg-sage/10 text-sage",
    warn: "bg-amber/10 text-amber",
    rose: "bg-rose/10 text-rose",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
};

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-medium uppercase tracking-wider text-faint">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

export const inputCls = "w-full rounded-xl px-4 py-3 text-[15px] outline-none border border-line bg-raised text-ink transition-colors focus:border-accent placeholder:text-faint";

export const EmptyState = ({ icon: Icon, title, body, action }: { icon: React.ElementType; title: string; body: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center text-center py-14 px-6">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-raised">
      <Icon size={24} className="text-accent" />
    </div>
    <p className="font-semibold text-lg mb-1.5 text-ink">{title}</p>
    <p className="text-sm max-w-xs leading-relaxed text-muted">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Modal = ({ children, onClose, wide }: { children: React.ReactNode; onClose?: () => void; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm"
    onClick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-md"} rounded-t-3xl sm:rounded-3xl border border-line bg-surface p-6 max-h-[88vh] overflow-y-auto`}>
      {children}
    </div>
  </div>
);

export const Stat = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) => (
  <>
    <p className="text-xs font-medium mb-1 text-faint">{label}</p>
    <p className={`text-2xl font-bold tabular-nums ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
  </>
);

export const LoadingState = ({ label = "Loading…" }: { label?: string }) => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted animate-pulse font-medium">{label}</div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-rose">{message}</div>
);
