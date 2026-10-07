import React, { useState } from 'react';
import { X, Building2, User, Mail, Phone, Globe, MapPin, Tag, ShieldAlert } from 'lucide-react';
import { Client, Industry, LeadSource, ClientStatus } from '../../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<Client> & { businessName: string }) => void;
  initialData?: Client | null;
  defaultStatus?: ClientStatus;
}

const INDUSTRIES: Industry[] = [
  'Cleaning',
  'Landscaping',
  'Auto Detailing',
  'Remodeling/Contractor',
  'Pressure Washing',
  'HVAC',
  'Wellness',
  'Restaurant',
  'Retail',
  'Other',
];

const LEAD_SOURCES: LeadSource[] = [
  'Meta Ads',
  'Google Ads',
  'Referral',
  'Cold Outreach',
  'Website Form',
  'Google Business',
  'Other',
];

const STATUSES: ClientStatus[] = [
  'Lead',
  'Proposal Sent',
  'Active Client',
  'Paused',
  'Past Client',
  'Lost',
];

export function ClientModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultStatus = 'Active Client',
}: ClientModalProps) {
  const [businessName, setBusinessName] = useState(initialData?.businessName || '');
  const [contactName, setContactName] = useState(initialData?.contactName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || 'Fort Lauderdale, FL');
  const [industry, setIndustry] = useState<Industry>(initialData?.industry || 'Landscaping');
  const [leadSource, setLeadSource] = useState<LeadSource>(initialData?.leadSource || 'Meta Ads');
  const [status, setStatus] = useState<ClientStatus>(initialData?.status || defaultStatus);
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [accessInfo, setAccessInfo] = useState(initialData?.accessInfo || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      id: initialData?.id,
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      address: address.trim(),
      city: city.trim(),
      industry,
      leadSource,
      status,
      tags,
      notes: notes.trim(),
      accessInfo: accessInfo.trim(),
      dateAdded: initialData?.dateAdded || new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3D5AFE]/15 text-[#22D3EE]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialData ? 'Edit Client Record' : 'Add New Client / Lead'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Agency client profile, contact channels & access details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs font-mono">
              {error}
            </div>
          )}

          {/* Business & Contact Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Business Name <span className="text-[#FF5A5F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Palm & Shore Landscaping"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Primary Contact Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Mateo Morales"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
                />
              </div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="mateo@palmandshorefl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Phone Number (Direct / WhatsApp)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="(954) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono placeholder-[#A9ADC6]/40"
                />
              </div>
            </div>
          </div>

          {/* Website & City / Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Website URL
              </label>
              <input
                type="text"
                placeholder="https://clientdomain.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                City / South Florida Area
              </label>
              <input
                type="text"
                placeholder="Fort Lauderdale, FL"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Street Address
              </label>
              <input
                type="text"
                placeholder="1200 E Commercial Blvd"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
              />
            </div>
          </div>

          {/* Industry, Lead Source & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-[#11131F]">
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src} className="bg-[#11131F]">
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Pipeline Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-[#11131F]">
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="Commercial, High Value, Meta Ads, Fast Payer"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          {/* Where Access Lives (Explicitly NO passwords) */}
          <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>Where Access Lives</span>
                <span className="text-[10px] text-[#22D3EE] font-mono font-normal">
                  (Delegations & Portals)
                </span>
              </label>
            </div>
            <p className="text-[11px] text-[#A9ADC6] mb-2">
              Note platform locations only (e.g. "Domain at GoDaddy, client owns login; Meta partner access granted 10/12; GBP manager invite sent"). Do not store passwords.
            </p>
            <textarea
              rows={2}
              placeholder="e.g. Domain at Cloudflare delegated to info@dynastysites.net; Meta Business Portfolio ID 9102488102; Google Ads linked via MCC."
              value={accessInfo}
              onChange={(e) => setAccessInfo(e.target.value)}
              className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40 font-mono"
            />
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Account Notes & Context
            </label>
            <textarea
              rows={3}
              placeholder="Any discovery notes, pain points, contract goals, meeting notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#262A40] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-white text-xs font-medium transition-all shadow-md shadow-[#3D5AFE]/20"
            >
              {initialData ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
