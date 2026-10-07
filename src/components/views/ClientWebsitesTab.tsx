import React, { useState } from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Server,
  Calendar,
  Key,
  UserCheck,
  Activity,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Link as LinkIcon,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { Client, ClientWebsite, RegistrarLoginOwner, SSLStatus } from '../../types';
import { formatDate, getDomainDaysRemaining } from '../../lib/calculations';

interface ClientWebsitesTabProps {
  client: Client;
  websites: ClientWebsite[];
  onSaveWebsite: (
    website: Partial<ClientWebsite> & { clientId: string; domain: string }
  ) => Promise<ClientWebsite>;
  onDeleteWebsite: (id: string) => Promise<void>;
}

export function ClientWebsitesTab({
  client,
  websites,
  onSaveWebsite,
  onDeleteWebsite,
}: ClientWebsitesTabProps) {
  const clientWebsites = websites.filter((w) => w.clientId === client.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<ClientWebsite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [domain, setDomain] = useState('');
  const [registrar, setRegistrar] = useState('Cloudflare');
  const [domainExpiryDate, setDomainExpiryDate] = useState('');
  const [registrarLoginOwner, setRegistrarLoginOwner] = useState<RegistrarLoginOwner>('us');
  const [hostingPlatform, setHostingPlatform] = useState('WP Engine');
  const [liveUrl, setLiveUrl] = useState('');
  const [sslStatus, setSslStatus] = useState<SSLStatus>('Active');
  const [lastBackupDate, setLastBackupDate] = useState('');
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [uptimeMonitorLink, setUptimeMonitorLink] = useState('');
  const [notes, setNotes] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const handleOpenAdd = () => {
    setEditingWebsite(null);
    setDomain(client.website ? client.website.replace(/^https?:\/\//i, '').replace(/\/+$/, '') : '');
    setRegistrar('Cloudflare');
    // Default 1 year from today
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setDomainExpiryDate(nextYear.toISOString().split('T')[0]);
    setRegistrarLoginOwner('us');
    setHostingPlatform('WP Engine');
    setLiveUrl(client.website || '');
    setSslStatus('Active');
    setLastBackupDate(todayStr);
    setLastUpdateDate(todayStr);
    setUptimeMonitorLink('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: ClientWebsite) => {
    setEditingWebsite(w);
    setDomain(w.domain);
    setRegistrar(w.registrar);
    setDomainExpiryDate(w.domainExpiryDate);
    setRegistrarLoginOwner(w.registrarLoginOwner);
    setHostingPlatform(w.hostingPlatform);
    setLiveUrl(w.liveUrl);
    setSslStatus(w.sslStatus);
    setLastBackupDate(w.lastBackupDate || '');
    setLastUpdateDate(w.lastUpdateDate || '');
    setUptimeMonitorLink(w.uptimeMonitorLink || '');
    setNotes(w.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setIsSaving(true);
    try {
      let cleanDomain = domain.trim().toLowerCase();
      cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

      let finalLiveUrl = liveUrl.trim();
      if (!finalLiveUrl) {
        finalLiveUrl = `https://${cleanDomain}`;
      } else if (!/^https?:\/\//i.test(finalLiveUrl)) {
        finalLiveUrl = `https://${finalLiveUrl}`;
      }

      await onSaveWebsite({
        id: editingWebsite?.id,
        clientId: client.id,
        domain: cleanDomain,
        registrar: registrar.trim() || 'Other',
        domainExpiryDate,
        registrarLoginOwner,
        hostingPlatform: hostingPlatform.trim() || 'Other',
        liveUrl: finalLiveUrl,
        sslStatus,
        lastBackupDate,
        lastUpdateDate,
        uptimeMonitorLink: uptimeMonitorLink.trim(),
        notes: notes.trim(),
      });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save website:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteWebsite(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete website:', err);
    }
  };

  const setShortcutDate = (yearsToAdd: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsToAdd);
    setDomainExpiryDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131F] border border-[#262A40]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Websites & Domain Infrastructure</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#181B2C] border border-[#262A40] text-[#22D3EE]">
                  {clientWebsites.length} {clientWebsites.length === 1 ? 'Site' : 'Sites'}
                </span>
              </h2>
              <p className="text-xs text-[#A9ADC6] mt-0.5">
                Manage live domain registrations, registrar login ownership, hosting platform, SSL certificate health, and maintenance schedules.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324CDD] text-white text-xs font-semibold shadow-md shadow-[#3D5AFE]/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* Website Cards Grid */}
      {clientWebsites.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#181B2C] border border-[#262A40] flex items-center justify-center text-[#A9ADC6]">
            <Globe className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-white">No Website Registered Yet</h3>
            <p className="text-xs text-[#A9ADC6] mt-1 leading-relaxed">
              Track {client.businessName}’s domain registrar, login credentials ownership, hosting environment, SSL health, and automated uptime alerts.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324CDD] text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Website</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {clientWebsites.map((web) => {
            const daysLeft = getDomainDaysRemaining(web.domainExpiryDate, now);
            const isExpired = daysLeft < 0;
            const isExpiringWithin30 = daysLeft >= 0 && daysLeft <= 30;
            const isExpiringWithin7 = daysLeft >= 0 && daysLeft <= 7;
            const isClientOwned = web.registrarLoginOwner === 'client';

            return (
              <div
                key={web.id}
                className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] hover:border-[#22D3EE]/40 transition-all space-y-4 shadow-sm"
              >
                {/* Header Row: Domain & Quick Links */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#262A40]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-lg font-bold text-white font-mono tracking-tight">
                        {web.domain}
                      </span>

                      {/* SSL Pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                          web.sslStatus === 'Active'
                            ? 'bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30'
                            : web.sslStatus === 'Expiring Soon'
                            ? 'bg-[#F5A524]/15 text-[#F5A524] border border-[#F5A524]/30'
                            : 'bg-[#FF5A5F]/15 text-[#FF5A5F] border border-[#FF5A5F]/30'
                        }`}
                      >
                        {web.sslStatus === 'Active' ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        <span>SSL: {web.sslStatus}</span>
                      </span>

                      {/* Domain Expiry Alert Pill */}
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/40 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>DOMAIN EXPIRED!</span>
                        </span>
                      ) : isExpiringWithin30 ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                            isExpiringWithin7
                              ? 'bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/40 animate-pulse'
                              : 'bg-[#F5A524]/20 text-[#F5A524] border border-[#F5A524]/40'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}!</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono text-[#7CFF6B] bg-[#7CFF6B]/10 border border-[#7CFF6B]/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active ({daysLeft}d left)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#A9ADC6] flex-wrap">
                      <a
                        href={web.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline font-mono"
                      >
                        <span>{web.liveUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Top Right Action Buttons */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    {web.uptimeMonitorLink && (
                      <a
                        href={web.uptimeMonitorLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#22D3EE]/15 border border-[#262A40] hover:border-[#22D3EE]/40 text-[#22D3EE] text-xs font-mono transition-all"
                        title="View Uptime Status Page"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#7CFF6B] animate-pulse" />
                        <span>Uptime Status</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenEdit(web)}
                      className="p-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] text-[#A9ADC6] hover:text-white border border-[#262A40] transition-colors cursor-pointer"
                      title="Edit website details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(web.id)}
                      className="p-1.5 rounded-lg bg-[#181B2C] hover:bg-[#FF5A5F]/20 text-[#A9ADC6] hover:text-[#FF5A5F] border border-[#262A40] transition-colors cursor-pointer"
                      title="Delete website"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Technical Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                  {/* Item 1: Registrar & Login Owner */}
                  <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#A9ADC6]">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#3D5AFE]" />
                        <span>Domain Registrar</span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">
                      {web.registrar}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                          isClientOwned
                            ? 'bg-[#F5A524]/15 text-[#F5A524] border border-[#F5A524]/30'
                            : 'bg-[#3D5AFE]/15 text-[#22D3EE] border border-[#3D5AFE]/30'
                        }`}
                      >
                        {isClientOwned ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Client owns login</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3 h-3" />
                            <span>We own login (Agency)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Item 2: Expiration Date */}
                  <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#A9ADC6]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#F5A524]" />
                        <span>Domain Expiry Date</span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">
                      {formatDate(web.domainExpiryDate)}
                    </div>
                    <div className="text-[11px] font-mono text-[#A9ADC6]">
                      {isExpired ? (
                        <span className="text-[#FF5A5F] font-bold">Expired {Math.abs(daysLeft)} days ago</span>
                      ) : daysLeft === 0 ? (
                        <span className="text-[#FF5A5F] font-bold">Expires TODAY!</span>
                      ) : (
                        <span>{daysLeft} days remaining</span>
                      )}
                    </div>
                  </div>

                  {/* Item 3: Hosting Platform */}
                  <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#A9ADC6]">
                      <span className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#22D3EE]" />
                        <span>Hosting Platform</span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">
                      {web.hostingPlatform}
                    </div>
                    <div className="text-[11px] text-[#A9ADC6]">
                      Fast cloud hosting environment
                    </div>
                  </div>

                  {/* Item 4: Maintenance (Backup & Updates) */}
                  <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#A9ADC6]">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-[#7CFF6B]" />
                        <span>Maintenance Logs</span>
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[#A9ADC6]">Last Backup:</span>
                        <span className="text-white font-medium">{formatDate(web.lastBackupDate)}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[#A9ADC6]">Last Update:</span>
                        <span className="text-white font-medium">{formatDate(web.lastUpdateDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes or Details Footer */}
                {web.notes && (
                  <div className="p-3 rounded-xl bg-[#07080F]/60 border border-[#262A40]/50 text-xs text-[#A9ADC6]">
                    <span className="font-semibold text-white mr-1.5">Infrastructure Notes:</span>
                    <span>{web.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#11131F] border border-[#262A40] p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A5F]/20 text-[#FF5A5F] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Delete Website Entry?</h3>
              <p className="text-xs text-[#A9ADC6] mt-1">
                Are you sure you want to remove this website record? This will delete domain expiration tracking and uptime link data.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 rounded-lg bg-[#FF5A5F] hover:bg-[#E0484D] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#11131F] border border-[#262A40] shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#262A40]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingWebsite ? 'Edit Website Details' : 'Add Website Record'}
                  </h3>
                  <p className="text-[11px] text-[#A9ADC6]">
                    {client.businessName} · Domain registration & hosting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Domain & Live URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Domain Name <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. palmshorelandscaping.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Live URL
                  </label>
                  <input
                    type="text"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://palmshorelandscaping.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Registrar & Login Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Domain Registrar <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="registrar-list"
                    value={registrar}
                    onChange={(e) => setRegistrar(e.target.value)}
                    placeholder="Cloudflare, GoDaddy, Namecheap..."
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white"
                  />
                  <datalist id="registrar-list">
                    <option value="Cloudflare" />
                    <option value="GoDaddy" />
                    <option value="Namecheap" />
                    <option value="Porkbun" />
                    <option value="Google Domains / Squarespace" />
                    <option value="Hostinger" />
                    <option value="SiteGround" />
                    <option value="Bluehost" />
                    <option value="Domain.com" />
                    <option value="Network Solutions" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Who Owns Registrar Login? <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRegistrarLoginOwner('us')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        registrarLoginOwner === 'us'
                          ? 'bg-[#3D5AFE]/20 border-[#3D5AFE] text-white font-semibold'
                          : 'bg-[#07080F] border-[#262A40] text-[#A9ADC6] hover:text-white'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>We Own (Us)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrarLoginOwner('client')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        registrarLoginOwner === 'client'
                          ? 'bg-[#F5A524]/20 border-[#F5A524] text-white font-semibold'
                          : 'bg-[#07080F] border-[#262A40] text-[#A9ADC6] hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Client Owns</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Domain Expiry Date & Quick Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#A9ADC6]">
                    Domain Expiry Date <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-[#A9ADC6]">Shortcuts:</span>
                    <button
                      type="button"
                      onClick={() => setShortcutDate(1)}
                      className="px-1.5 py-0.5 rounded bg-[#181B2C] hover:bg-[#262A40] text-[#22D3EE] cursor-pointer"
                    >
                      +1yr
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutDate(2)}
                      className="px-1.5 py-0.5 rounded bg-[#181B2C] hover:bg-[#262A40] text-[#22D3EE] cursor-pointer"
                    >
                      +2yr
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutDate(3)}
                      className="px-1.5 py-0.5 rounded bg-[#181B2C] hover:bg-[#262A40] text-[#22D3EE] cursor-pointer"
                    >
                      +3yr
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={domainExpiryDate}
                  onChange={(e) => setDomainExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                />
              </div>

              {/* Hosting Platform & SSL Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Hosting Platform <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="hosting-list"
                    value={hostingPlatform}
                    onChange={(e) => setHostingPlatform(e.target.value)}
                    placeholder="WP Engine, Vercel, Hostinger..."
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white"
                  />
                  <datalist id="hosting-list">
                    <option value="WP Engine" />
                    <option value="Vercel" />
                    <option value="Hostinger" />
                    <option value="DigitalOcean" />
                    <option value="SiteGround" />
                    <option value="Cloudways" />
                    <option value="Shopify" />
                    <option value="AWS / Cloudflare Pages" />
                    <option value="Kinsta" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    SSL Status
                  </label>
                  <select
                    value={sslStatus}
                    onChange={(e) => setSslStatus(e.target.value as SSLStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white"
                  >
                    <option value="Active">Active (Secure & Valid)</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired / Insecure</option>
                    <option value="Pending">Pending Setup</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Last Backup Date & Last Update Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#A9ADC6]">
                      Last Backup Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setLastBackupDate(todayStr)}
                      className="text-[10px] font-mono text-[#22D3EE] hover:underline cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                  <input
                    type="date"
                    value={lastBackupDate}
                    onChange={(e) => setLastBackupDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#A9ADC6]">
                      Last Update Date (Plugins/Core)
                    </label>
                    <button
                      type="button"
                      onClick={() => setLastUpdateDate(todayStr)}
                      className="text-[10px] font-mono text-[#22D3EE] hover:underline cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                  <input
                    type="date"
                    value={lastUpdateDate}
                    onChange={(e) => setLastUpdateDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Uptime Monitor Link */}
              <div>
                <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                  Uptime Monitor Link
                </label>
                <input
                  type="url"
                  value={uptimeMonitorLink}
                  onChange={(e) => setUptimeMonitorLink(e.target.value)}
                  placeholder="https://stats.uptimerobot.com/... or https://betteruptime.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                  Infrastructure Notes & Details
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cloudflare DNS proxying, email routing on Google Workspace, nameserver records..."
                  className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none text-xs text-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#262A40]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181B2C] hover:bg-[#262A40] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324CDD] disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-[#3D5AFE]/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingWebsite ? 'Save Changes' : 'Create Website Record'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
