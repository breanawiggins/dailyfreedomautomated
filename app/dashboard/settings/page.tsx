"use client";

import { useState, useEffect } from "react";
import { NicheSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Instagram,
  Clock,
  Hash,
  Settings2,
} from "lucide-react";

interface BufferProfile {
  id: string;
  service: string;
  formatted_username: string;
  avatar: string;
}

const PRIMARY_HASHTAGS = [
  "#herdailyfreedom",
  "#facelessmarketing",
  "#digitalfreedom",
];

const SECONDARY_HASHTAGS = [
  "#makemoneyonline",
  "#onlinebusiness",
  "#contentcreator",
  "#facelesscontent",
  "#womeninbusiness",
  "#digitalproducts",
  "#passiveincome",
  "#motivation",
];

const POSTING_TIMES = [
  { time: "8:00 AM", label: "Morning" },
  { time: "12:00 PM", label: "Midday" },
  { time: "6:00 PM", label: "Evening" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<BufferProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [nicheLoading, setNicheLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [nicheTopic, setNicheTopic] = useState("");
  const [tone, setTone] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentPillars, setContentPillars] = useState("");
  const [ctaKeyword, setCtaKeyword] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  useEffect(() => {
    // Fetch Buffer profile
    fetch("/api/settings/buffer-profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.profile) setProfile(res.profile);
        else setProfileError("Could not load profile");
      })
      .catch(() => setProfileError("Connection error"))
      .finally(() => setProfileLoading(false));

    // Fetch niche settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const s = res.data as NicheSettings;
          setName(s.name);
          setNicheTopic(s.niche_topic);
          setTone(s.tone);
          setTargetAudience(s.target_audience);
          setContentPillars(s.content_pillars?.join(", ") || "");
          setCtaKeyword(s.cta_keyword);
          setInstagramHandle(s.instagram_handle);
        }
      })
      .catch(() => {})
      .finally(() => setNicheLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          niche_topic: nicheTopic,
          tone,
          target_audience: targetAudience,
          content_pillars: contentPillars.split(",").map((s) => s.trim()).filter(Boolean),
          cta_keyword: ctaKeyword,
          instagram_handle: instagramHandle,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // silently fail
    }
    setSaving(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Instagram Connection */}
        <section className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Instagram className="w-4 h-4 text-[#C9A96E]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              Instagram Connection
            </h2>
          </div>

          {profileLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking connection...
            </div>
          ) : profileError ? (
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 text-[#C62828]" />
              <span className="text-[#C62828]">Disconnected</span>
              <span className="text-[#6B6B6B]">— {profileError}</span>
            </div>
          ) : profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                <span className="text-sm font-medium text-[#2E7D32]">
                  Connected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#6B6B6B]">Profile</span>
                  <p className="font-medium text-[#1A1A1A]">
                    {profile.formatted_username}
                  </p>
                </div>
                <div>
                  <span className="text-[#6B6B6B]">Profile ID</span>
                  <p className="font-mono text-xs text-[#6B6B6B]">
                    {profile.id}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Posting Schedule */}
        <section className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#C9A96E]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              Posting Schedule
            </h2>
          </div>
          <div className="space-y-2">
            {POSTING_TIMES.map((slot) => (
              <div
                key={slot.time}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FAF9F7]"
              >
                <span className="text-sm text-[#6B6B6B]">{slot.label}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {slot.time}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6B6B6B] mt-3">
            Timezone: America/New_York (EST/EDT)
          </p>
        </section>

        {/* Niche Settings */}
        <section className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-[#C9A96E]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              Niche Settings
            </h2>
          </div>

          {nicheLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Brand Name" value={name} onChange={setName} />
              <Field
                label="Niche Topic"
                value={nicheTopic}
                onChange={setNicheTopic}
              />
              <Field label="Tone" value={tone} onChange={setTone} />
              <Field
                label="Target Audience"
                value={targetAudience}
                onChange={setTargetAudience}
              />
              <Field
                label="Content Pillars"
                value={contentPillars}
                onChange={setContentPillars}
                placeholder="e.g. motivation, strategy, lifestyle"
              />
              <Field
                label="CTA Keyword"
                value={ctaKeyword}
                onChange={setCtaKeyword}
              />
              <Field
                label="Instagram Handle"
                value={instagramHandle}
                onChange={setInstagramHandle}
              />

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#C9A96E] text-white hover:bg-[#B89860] border-0"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              {saveSuccess && (
                <p className="text-sm text-[#2E7D32] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Settings saved
                </p>
              )}
            </div>
          )}
        </section>

        {/* Hashtag Settings */}
        <section className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-[#C9A96E]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              Hashtag Settings
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-2">
                Primary (always included)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRIMARY_HASHTAGS.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-[#C9A96E]/10 text-[#C9A96E] px-2 py-1 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-2">
                Secondary Pool
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SECONDARY_HASHTAGS.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-[#F5F5F5] text-[#6B6B6B] px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#6B6B6B]">
              Max 8 hashtags per post. Primary hashtags are always included.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}
