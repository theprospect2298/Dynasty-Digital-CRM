import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Lock,
  Building2,
  RotateCcw,
  AlertTriangle,
  Check,
  Briefcase,
  ListChecks,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import { ServiceCatalogItem, AppSettings, BillingType, ChecklistTemplate } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { useToast } from '../../context/ToastContext';

interface SettingsViewProps {
  settings: AppSettings;
  catalog: ServiceCatalogItem[];
  checklistTemplates?: ChecklistTemplate[];
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onSaveCatalogItem: (item: Partial<ServiceCatalogItem> & { name: string; defaultPrice: number }) => void;
  onDeleteCatalogItem: (id: string) => void;
  onSaveChecklistTemplate?: (template: ChecklistTemplate) => void;
  onDeleteChecklistTemplate?: (id: string) => void;
  onResetDefaultChecklistTemplates?: () => void;
  onExportJson: () => void;
  onImportJson: (jsonStr: string) => boolean | Promise<boolean>;
  onExportCsv: () => void;
  onMigrateLocalStorage: () => Promise<void>;
  onClearSampleData: () => void;
  onRestoreSampleData: () => void;
}

export function SettingsView({
  settings,
  catalog,
  checklistTemplates = [],
  onSaveSettings,
  onSaveCatalogItem,
  onDeleteCatalogItem,
  onSaveChecklistTemplate,
  onDeleteChecklistTemplate,
  onResetDefaultChecklistTemplates,
  onExportJson,
  onImportJson,
  onExportCsv,
  onMigrateLocalStorage,
  onClearSampleData,
  onRestoreSampleData,
}: SettingsViewProps) {
  const { toast } = useToast();
  const [migrating, setMigrating] = useState(false);

  // Business info form state
  const [agencyName, setAgencyName] = useState(settings.agencyName || 'Dynasty Digital');
  const [phone, setPhone] = useState(settings.phone || '(954) 294-3230');
  const [email, setEmail] = useState(settings.email || 'info@dynastysites.net');
  const [website, setWebsite] = useState(settings.website || 'https://dynastysites.net');
  const [location, setLocation] = useState(settings.location || 'Fort Lauderdale, South Florida');
  const [defaultBillingDay, setDefaultBillingDay] = useState(settings.defaultBillingDay || 1);

  // PIN settings state
  const [pinEnabled, setPinEnabled] = useState(settings.pinEnabled ?? true);
  const [pinCode, setPinCode] = useState(settings.pinCode || '1234');

  // Catalog item edit/add modal state
  const [editingCatalogItem, setEditingCatalogItem] = useState<ServiceCatalogItem | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catCategory, setCatCategory] = useState('Website Care Plan');
  const [catBillingType, setCatBillingType] = useState<BillingType>('monthly');
  const [catPrice, setCatPrice] = useState(297);
  const [catSetupFee, setCatSetupFee] = useState(0);
  const [catMinTerm, setCatMinTerm] = useState(12);

  const handleSaveBusinessInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      agencyName,
      phone,
      email,
      website,
      location,
      defaultBillingDay: Number(defaultBillingDay) || 1,
      pinEnabled,
      pinCode,
    });
    toast('Agency settings & PIN saved successfully');
  };

  const handleOpenNewCatalog = () => {
    setEditingCatalogItem(null);
    setCatName('');
    setCatCategory('Website Care Plan');
    setCatBillingType('monthly');
    setCatPrice(297);
    setCatSetupFee(0);
    setCatMinTerm(12);
    setIsCatalogModalOpen(true);
  };

  const handleOpenEditCatalog = (item: ServiceCatalogItem) => {
    setEditingCatalogItem(item);
    setCatName(item.name);
    setCatCategory(item.category);
    setCatBillingType(item.billingType);
    setCatPrice(item.defaultPrice);
    setCatSetupFee(item.setupFee);
    setCatMinTerm(item.minimumTermMonths);
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalogModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    onSaveCatalogItem({
      id: editingCatalogItem?.id,
      name: catName.trim(),
      category: catCategory,
      billingType: catBillingType,
      defaultPrice: Number(catPrice) || 0,
      setupFee: Number(catSetupFee) || 0,
      minimumTermMonths: Number(catMinTerm) || 0,
      active: true,
    });
    setIsCatalogModalOpen(false);
    toast(editingCatalogItem ? 'Catalog service updated' : 'Catalog service added');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = onImportJson(content);
      if (success) {
        toast('Database successfully restored from JSON');
      } else {
        toast('Failed to import JSON: invalid structure', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Checklist templates state
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    checklistTemplates[0]?.id || 'tmpl_website_build'
  );
  const [newStepText, setNewStepText] = useState('');
  const [isAddingNewTemplate, setIsAddingNewTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCat, setNewTemplateCat] = useState('Website Build');

  const currentTemplate =
    checklistTemplates.find((t) => t.id === activeTemplateId) || checklistTemplates[0];

  const handleAddStepToTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim() || !currentTemplate) return;
    const updated = {
      ...currentTemplate,
      items: [...currentTemplate.items, newStepText.trim()],
    };
    onSaveChecklistTemplate?.(updated);
    setNewStepText('');
    toast(`Added step to ${currentTemplate.name}`);
  };

  const handleDeleteStepFromTemplate = (index: number) => {
    if (!currentTemplate) return;
    const updatedItems = currentTemplate.items.filter((_, i) => i !== index);
    const updated = { ...currentTemplate, items: updatedItems };
    onSaveChecklistTemplate?.(updated);
    toast('Step removed from template');
  };

  const handleUpdateStepLabel = (index: number, newLabel: string) => {
    if (!currentTemplate || !newLabel.trim()) return;
    const updatedItems = [...currentTemplate.items];
    updatedItems[index] = newLabel.trim();
    const updated = { ...currentTemplate, items: updatedItems };
    onSaveChecklistTemplate?.(updated);
    toast('Template step updated');
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!currentTemplate) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentTemplate.items.length) return;
    const newItems = [...currentTemplate.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    const updated = { ...currentTemplate, items: newItems };
    onSaveChecklistTemplate?.(updated);
  };

  const handleCreateNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) return;
    const id = `tmpl_${Date.now()}`;
    const newTmpl: ChecklistTemplate = {
      id,
      name: newTemplateTitle.trim(),
      serviceCategory: newTemplateCat,
      description: `Custom checklist for ${newTemplateTitle.trim()}`,
      items: ['Initial kickoff', 'Client onboarding review'],
    };
    onSaveChecklistTemplate?.(newTmpl);
    setActiveTemplateId(id);
    setIsAddingNewTemplate(false);
    setNewTemplateTitle('');
    toast(`Created new template: ${newTmpl.name}`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. Agency Business Profile */}
      <div className="p-6 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#262A40]">
          <Building2 className="w-5 h-5 text-[#22D3EE]" />
          <div>
            <h3 className="text-sm font-semibold text-white">Dynasty Digital Business Info</h3>
            <p className="text-xs text-[#A9ADC6]">
              Agency branding, South Florida coordinates & default invoice terms
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Agency Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Primary Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Agency Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Location Region
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Default Monthly Billing Day
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={defaultBillingDay}
                onChange={(e) => setDefaultBillingDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>

            {/* PIN Settings */}
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                CRM Security PIN (Keypad)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinEnabled}
                  onChange={(e) => setPinEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262A40] bg-[#07080F] text-[#22D3EE] focus:ring-0"
                />
                <span className="text-xs text-white">Require PIN lock on load</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-md shadow-[#3D5AFE]/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* 2. Service Catalog Editor */}
      <div className="p-6 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#262A40]">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-[#F5A524]" />
            <div>
              <h3 className="text-sm font-semibold text-white">Agency Service Catalog</h3>
              <p className="text-xs text-[#A9ADC6]">
                Editable catalog for website builds, care plans, GBP and ad management
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenNewCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Catalog Item</span>
          </button>
        </div>

        <div className="rounded-xl border border-[#262A40] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#262A40] bg-[#07080F] text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6]">
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Default Price</th>
                  <th className="py-2.5 px-3 text-right">Setup Fee</th>
                  <th className="py-2.5 px-3 text-center">Min Term</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262A40]/40">
                {catalog.map((item) => (
                  <tr key={item.id} className="hover:bg-[#181B2C]/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-[#A9ADC6]">{item.category}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {item.billingType === 'monthly' ? 'Monthly' : 'One-time'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(item.defaultPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#A9ADC6]">
                      {item.setupFee > 0 ? formatCurrency(item.setupFee) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[#A9ADC6]">
                      {item.minimumTermMonths > 0 ? `${item.minimumTermMonths}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditCatalog(item)}
                          className="p-1 text-[#A9ADC6] hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete catalog item "${item.name}"?`)) {
                              onDeleteCatalogItem(item.id);
                              toast('Catalog item removed');
                            }
                          }}
                          className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2b. Onboarding & Service Checklist Templates */}
      <div className="p-6 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#262A40] gap-3">
          <div className="flex items-center gap-2.5">
            <ListChecks className="w-5 h-5 text-[#22D3EE]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Delivery & Onboarding Checklist Templates
              </h3>
              <p className="text-xs text-[#A9ADC6]">
                Templates automatically spawn client checklists when services are attached. Fully customizable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResetDefaultChecklistTemplates && (
              <button
                onClick={() => {
                  if (confirm('Reset templates back to Dynasty Digital standard defaults (Website Build, Ads, GBP)?')) {
                    onResetDefaultChecklistTemplates();
                    toast('Checklist templates reset to defaults');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#07080F] hover:bg-white/5 border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white transition-colors"
                title="Restore default templates"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            )}

            <button
              onClick={() => setIsAddingNewTemplate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {checklistTemplates.map((tmpl) => {
            const isActive = tmpl.id === activeTemplateId;
            return (
              <button
                key={tmpl.id}
                onClick={() => setActiveTemplateId(tmpl.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  isActive
                    ? 'bg-[#22D3EE]/15 border-[#22D3EE]/50 text-[#22D3EE]'
                    : 'bg-[#07080F] border-[#262A40] text-[#A9ADC6] hover:text-white hover:border-[#262A40]/80'
                }`}
              >
                <span>{tmpl.name}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#11131F] border border-[#262A40]">
                  {tmpl.items.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Template Card */}
        {currentTemplate && (
          <div className="p-5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262A40]/60">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{currentTemplate.name}</h4>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181B2C] border border-[#262A40] text-[#22D3EE]">
                    {currentTemplate.serviceCategory || 'Service Template'}
                  </span>
                </div>
                <p className="text-xs text-[#A9ADC6] mt-0.5">{currentTemplate.description}</p>
              </div>

              {!['tmpl_website_build', 'tmpl_ads', 'tmpl_gbp'].includes(currentTemplate.id) && onDeleteChecklistTemplate && (
                <button
                  onClick={() => {
                    if (confirm(`Delete custom template "${currentTemplate.name}"?`)) {
                      onDeleteChecklistTemplate(currentTemplate.id);
                      setActiveTemplateId('tmpl_website_build');
                      toast('Template deleted');
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF5A5F]/10 hover:bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/30 text-xs font-medium self-start sm:self-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Template</span>
                </button>
              )}
            </div>

            {/* Checklist Items list */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6] block">
                Workflow Steps ({currentTemplate.items.length})
              </span>

              <div className="space-y-1.5">
                {currentTemplate.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#11131F] border border-[#262A40] flex items-center justify-between gap-3 group hover:border-[#22D3EE]/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="font-mono text-xs text-[#A9ADC6]/60 w-5 shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        defaultValue={item}
                        onBlur={(e) => {
                          if (e.target.value !== item) {
                            handleUpdateStepLabel(idx, e.target.value);
                          }
                        }}
                        className="flex-1 bg-transparent border-0 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22D3EE] rounded px-1.5 py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#A9ADC6] hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === currentTemplate.items.length - 1}
                        className="p-1 rounded text-[#A9ADC6] hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStepFromTemplate(idx)}
                        className="p-1 rounded text-[#A9ADC6] hover:text-[#FF5A5F] transition-colors"
                        title="Remove Step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Step Form */}
              <form onSubmit={handleAddStepToTemplate} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="+ Add new checklist step..."
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#11131F] border border-[#262A40] text-xs text-white placeholder-[#A9ADC6]/50 focus:outline-none focus:border-[#22D3EE]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#181B2C] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-xs font-semibold text-white border border-[#262A40] transition-colors"
                >
                  Add Step
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add New Custom Template */}
        {isAddingNewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-[#11131F] border border-[#262A40] p-6 shadow-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Create New Checklist Template</h3>
                <p className="text-xs text-[#A9ADC6] mt-1">
                  Define a new standardized workflow template for your service catalog.
                </p>
              </div>

              <form onSubmit={handleCreateNewTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SEO Audit Sprint, CRM Setup, Brand Identity"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Service Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Website Care Plan, SEO, Marketing"
                    value={newTemplateCat}
                    onChange={(e) => setNewTemplateCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262A40]">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTemplate(false)}
                    className="px-4 py-2 rounded-xl bg-[#181B2C] text-xs font-medium text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-colors"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 3. Settings > Data Management (Export JSON, Import JSON, Export CSV) */}
      <div className="p-6 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
        <div className="pb-2 border-b border-[#262A40]">
          <h3 className="text-sm font-semibold text-white">Data Management & Persistence</h3>
          <p className="text-xs text-[#A9ADC6]">
            Export or import your full database (clients, services, retainers, payments, tasks) so you never lose data
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export JSON */}
          <button
            onClick={() => {
              onExportJson();
              toast('Full CRM JSON backup downloaded');
            }}
            className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE] transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <Download className="w-6 h-6 text-[#22D3EE] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Export All Data (JSON)</span>
            <span className="text-[10px] text-[#A9ADC6] mt-0.5">
              Complete snapshot for backup or Firestore migration
            </span>
          </button>

          {/* Import JSON */}
          <label className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#3D5AFE] transition-all flex flex-col items-center justify-center text-center group cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Upload className="w-6 h-6 text-[#3D5AFE] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Import JSON Backup</span>
            <span className="text-[10px] text-[#A9ADC6] mt-0.5">
              Restore from previously downloaded backup
            </span>
          </label>

          {/* Export CSV */}
          <button
            onClick={() => {
              onExportCsv();
              toast('Client list exported to CSV');
            }}
            className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#7CFF6B] transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <FileSpreadsheet className="w-6 h-6 text-[#7CFF6B] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Export Clients to CSV</span>
            <span className="text-[10px] text-[#A9ADC6] mt-0.5">
              Download contacts, MRR & notes for spreadsheets
            </span>
          </button>
        </div>

        {/* One-Time LocalStorage to Firestore Migration Card */}
        <div className="p-4 rounded-xl bg-[#07080F] border border-[#22D3EE]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
              <h4 className="text-xs font-semibold text-white">
                One-Time Migration to Cloud Firestore
              </h4>
            </div>
            <p className="text-[11px] text-[#A9ADC6] leading-relaxed">
              Transfer your existing clients, retainers, payments, projects, and tasks from browser localStorage into your secure cloud Firestore database.
            </p>
          </div>

          <button
            onClick={async () => {
              setMigrating(true);
              try {
                await onMigrateLocalStorage();
              } finally {
                setMigrating(false);
              }
            }}
            disabled={migrating}
            className="px-4 py-2.5 rounded-xl bg-[#22D3EE] hover:bg-[#1bb8cf] text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-[#22D3EE]/20 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {migrating ? 'Migrating to Cloud...' : 'Migrate my localStorage data to Firestore'}
          </button>
        </div>

        {/* Sample Data Controls */}
        <div className="pt-4 border-t border-[#262A40] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#A9ADC6]">
            <span>Dynasty Digital CRM Sample Data: 6 realistic South Florida client records</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Clear all sample data? Your database will be reset to empty.')) {
                  onClearSampleData();
                  toast('Sample data cleared');
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-[#FF5A5F]/40 text-[#FF5A5F] hover:bg-[#FF5A5F]/10 text-xs font-mono transition-colors"
            >
              Clear sample data
            </button>
            <button
              onClick={() => {
                if (confirm('Reset to standard Dynasty Digital sample clients?')) {
                  onRestoreSampleData();
                  toast('Sample data restored');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-xs font-mono text-[#22D3EE] hover:bg-[#181B2C] transition-colors"
            >
              Restore sample data
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Item Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {editingCatalogItem ? 'Edit Catalog Service' : 'Add Catalog Service'}
            </h3>

            <form onSubmit={handleSaveCatalogModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Website Care Plan: Partner"
                  className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={catCategory}
                    onChange={(e) => setCatCategory(e.target.value)}
                    placeholder="Website Build"
                    className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Billing Type
                  </label>
                  <select
                    value={catBillingType}
                    onChange={(e) => setCatBillingType(e.target.value as BillingType)}
                    className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={catPrice}
                    onChange={(e) => setCatPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Setup Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={catSetupFee}
                    onChange={(e) => setCatSetupFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                    Min Term (Mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={catMinTerm}
                    onChange={(e) => setCatMinTerm(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#262A40] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
