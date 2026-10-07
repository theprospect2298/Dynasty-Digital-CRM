import React, { useState } from 'react';
import {
  X,
  FileText,
  Link as LinkIcon,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Client, ClientDocuments, ESignStatus, ClientFileLink } from '../../types';

interface ClientDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSave: (documents: ClientDocuments) => Promise<void>;
}

export function ClientDocumentsModal({
  isOpen,
  onClose,
  client,
  onSave,
}: ClientDocumentsModalProps) {
  const existingDocs = client.documents || {};

  const [proposalLink, setProposalLink] = useState(existingDocs.proposal?.link || '');
  const [proposalSentDate, setProposalSentDate] = useState(existingDocs.proposal?.sentDate || '');
  const [proposalAcceptedDate, setProposalAcceptedDate] = useState(
    existingDocs.proposal?.acceptedDate || ''
  );

  const [agreementLink, setAgreementLink] = useState(existingDocs.agreement?.link || '');
  const [agreementSignedDate, setAgreementSignedDate] = useState(
    existingDocs.agreement?.signedDate || ''
  );
  const [eSignStatus, setESignStatus] = useState<ESignStatus>(
    existingDocs.agreement?.eSignStatus || 'Not Sent'
  );

  const [paymentTermsVersion, setPaymentTermsVersion] = useState(
    existingDocs.paymentTermsVersion || 'DD-Standard Net 15 v2026.1'
  );
  const [paymentTermsSummary, setPaymentTermsSummary] = useState(
    existingDocs.paymentTermsSummary ||
      'Net 15 - Automated ACH via Stripe. Billed on the 1st of each month.'
  );

  const [fileLinks, setFileLinks] = useState<ClientFileLink[]>(existingDocs.fileLinks || []);

  // New file link temp state
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileCategory, setNewFileCategory] = useState('Brand Assets');
  const [saving, setSaving] = useState(false);

  const handleAddFileLink = () => {
    if (!newFileTitle.trim() || !newFileUrl.trim()) return;
    const newLink: ClientFileLink = {
      id: `fl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newFileTitle.trim(),
      url: newFileUrl.trim(),
      category: newFileCategory,
      addedDate: new Date().toISOString().split('T')[0],
    };
    setFileLinks([...fileLinks, newLink]);
    setNewFileTitle('');
    setNewFileUrl('');
  };

  const handleRemoveFileLink = (id: string) => {
    setFileLinks(fileLinks.filter((fl) => fl.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedDocs: ClientDocuments = {
        proposal: {
          link: proposalLink.trim() || undefined,
          sentDate: proposalSentDate || undefined,
          acceptedDate: proposalAcceptedDate || undefined,
        },
        agreement: {
          link: agreementLink.trim() || undefined,
          signedDate: agreementSignedDate || undefined,
          eSignStatus,
        },
        paymentTermsVersion: paymentTermsVersion.trim() || undefined,
        paymentTermsSummary: paymentTermsSummary.trim() || undefined,
        fileLinks,
      };

      await onSave(updatedDocs);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#11131F] border border-[#262A40] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262A40] bg-[#181A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Manage Client Documents</span>
              </h2>
              <p className="text-xs text-[#A9ADC6]">{client.businessName} • Legal & Contract Files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#262A40] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Proposal */}
          <div className="p-4 rounded-xl bg-[#181A2A]/50 border border-[#262A40] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[#22D3EE]" />
              <span>Proposal Document</span>
            </div>

            <div>
              <label className="block text-xs text-[#A9ADC6] mb-1">Proposal URL Link</label>
              <input
                type="url"
                value={proposalLink}
                onChange={(e) => setProposalLink(e.target.value)}
                placeholder="https://dynastysites.net/proposals/client.pdf"
                className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">Sent Date</label>
                <input
                  type="date"
                  value={proposalSentDate}
                  onChange={(e) => setProposalSentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">Accepted Date</label>
                <input
                  type="date"
                  value={proposalAcceptedDate}
                  onChange={(e) => setProposalAcceptedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Agreement (Contract) */}
          <div className="p-4 rounded-xl bg-[#181A2A]/50 border border-[#262A40] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#7CFF6B]" />
                <span>Master Services Agreement (MSA / Contract)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  eSignStatus === 'Signed'
                    ? 'bg-[#7CFF6B]/15 text-[#7CFF6B]'
                    : 'bg-[#F5A524]/15 text-[#F5A524]'
                }`}
              >
                {eSignStatus}
              </span>
            </div>

            <div>
              <label className="block text-xs text-[#A9ADC6] mb-1">Agreement URL Link</label>
              <input
                type="url"
                value={agreementLink}
                onChange={(e) => setAgreementLink(e.target.value)}
                placeholder="https://dynastysites.net/agreements/client-msa.pdf"
                className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#7CFF6B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">E-Sign Status *</label>
                <select
                  value={eSignStatus}
                  onChange={(e) => setESignStatus(e.target.value as ESignStatus)}
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7CFF6B]"
                >
                  <option value="Not Sent">Not Sent</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent for Signature">Sent for Signature</option>
                  <option value="Signed">Signed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">Signed Date</label>
                <input
                  type="date"
                  value={agreementSignedDate}
                  onChange={(e) => setAgreementSignedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7CFF6B]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment Terms Version */}
          <div className="p-4 rounded-xl bg-[#181A2A]/50 border border-[#262A40] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-[#3D5AFE]" />
              <span>Payment Terms Version & Terms</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">Payment Terms Version</label>
                <input
                  type="text"
                  value={paymentTermsVersion}
                  onChange={(e) => setPaymentTermsVersion(e.target.value)}
                  placeholder="DD-Standard Net 15 v2026.1"
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A9ADC6] mb-1">Summary / Policy</label>
                <input
                  type="text"
                  value={paymentTermsSummary}
                  onChange={(e) => setPaymentTermsSummary(e.target.value)}
                  placeholder="Net 15 - Auto ACH billing via Stripe..."
                  className="w-full px-3 py-2 bg-[#11131F] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Additional File Links */}
          <div className="p-4 rounded-xl bg-[#181A2A]/50 border border-[#262A40] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <LinkIcon className="w-4 h-4 text-[#F5A524]" />
                <span>Additional File Links ({fileLinks.length})</span>
              </div>
            </div>

            {/* List existing links */}
            {fileLinks.length > 0 && (
              <div className="space-y-2">
                {fileLinks.map((fl) => (
                  <div
                    key={fl.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#11131F] border border-[#262A40] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#262A40] text-[#A9ADC6]">
                        {fl.category || 'File'}
                      </span>
                      <span className="text-white font-medium truncate">{fl.title}</span>
                      <a
                        href={fl.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#22D3EE] hover:underline flex items-center gap-0.5 text-[11px] truncate"
                      >
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFileLink(fl.id)}
                      className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new link input row */}
            <div className="pt-2 border-t border-[#262A40]/50 space-y-2">
              <span className="text-[11px] font-semibold text-[#A9ADC6] block">Add File / Resource Link:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  placeholder="Title (e.g. Logo Folder)"
                  className="px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#22D3EE]"
                />
                <input
                  type="url"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#22D3EE]"
                />
                <div className="flex gap-2">
                  <select
                    value={newFileCategory}
                    onChange={(e) => setNewFileCategory(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#22D3EE]"
                  >
                    <option value="Brand Assets">Brand Assets</option>
                    <option value="Access & Logins">Access & Logins</option>
                    <option value="Creative">Creative</option>
                    <option value="Legal">Legal</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddFileLink}
                    disabled={!newFileTitle.trim() || !newFileUrl.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#22D3EE]/20 hover:bg-[#22D3EE]/30 text-[#22D3EE] border border-[#22D3EE]/40 text-xs font-semibold disabled:opacity-30 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262A40]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#181A2A] text-[#A9ADC6] hover:text-white border border-[#262A40] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3D5AFE] hover:bg-[#324bda] text-white transition-all shadow-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
