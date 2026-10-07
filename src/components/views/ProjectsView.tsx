import React from 'react';
import {
  FolderGit2,
  Plus,
  Calendar,
  ExternalLink,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { Client, Project, ProjectStage, ClientChecklist } from '../../types';
import { formatDate, getClientChecklistsProgress, getChecklistProgress } from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  checklists?: ClientChecklist[];
  onSelectClient: (clientId: string) => void;
  onOpenNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onChangeProjectStage: (projectId: string, stage: ProjectStage) => void;
  onTogglePaymentFlag: (projectId: string, field: 'depositPaid' | 'finalPaid') => void;
}

const PROJECT_STAGES: ProjectStage[] = [
  'Mockup',
  'Proposal',
  'Deposit Paid',
  'Design',
  'Build',
  'Review',
  'Final Payment',
  'Launched',
];

export function ProjectsView({
  projects,
  clients,
  checklists = [],
  onSelectClient,
  onOpenNewProject,
  onEditProject,
  onDeleteProject,
  onChangeProjectStage,
  onTogglePaymentFlag,
}: ProjectsViewProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#11131F] border border-[#262A40]">
        <div>
          <h2 className="text-base font-semibold text-white">Website Builds & Project Milestones</h2>
          <p className="text-xs text-[#A9ADC6]">
            Track delivery progress from initial mockup through client review and official launch
          </p>
        </div>
        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Kanban Board of Stages (horizontal scroll on small screens) */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {PROJECT_STAGES.map((stage, stageIndex) => {
          const stageProjects = projects.filter((p) => p.stage === stage);

          return (
            <div
              key={stage}
              className="w-72 shrink-0 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col min-h-[480px]"
            >
              {/* Stage Header */}
              <div className="p-3.5 border-b border-[#262A40] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white font-mono">{stage}</h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#07080F] border border-[#262A40] text-[#22D3EE]">
                    {stageProjects.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {stageProjects.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#A9ADC6]/40 italic">
                    No builds in {stage}
                  </div>
                ) : (
                  stageProjects.map((project) => {
                    const client = clients.find((c) => c.id === project.clientId);
                    const isMockupLate =
                      project.mockupDue && project.mockupDue < todayStr && stage === 'Mockup';
                    const isLaunchLate =
                      project.targetLaunch &&
                      project.targetLaunch < todayStr &&
                      stage !== 'Launched';

                    return (
                      <div
                        key={project.id}
                        className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE]/40 transition-all space-y-2.5 shadow-sm"
                      >
                        {/* Title & Client */}
                        <div>
                          <span
                            onClick={() => client && onSelectClient(client.id)}
                            className="text-[11px] font-mono text-[#22D3EE] hover:underline cursor-pointer block truncate"
                          >
                            {client?.businessName || 'Client'}
                          </span>
                          <h4 className="text-xs font-semibold text-white mt-0.5 leading-snug">
                            {project.name}
                          </h4>
                        </div>

                        {/* Dates & Warnings */}
                        <div className="space-y-1 text-[10px] font-mono">
                          {project.mockupDue && (
                            <div
                              className={`flex items-center justify-between ${
                                isMockupLate ? 'text-[#FF5A5F]' : 'text-[#A9ADC6]'
                              }`}
                            >
                              <span>Mockup:</span>
                              <span className="flex items-center gap-1">
                                {isMockupLate && <AlertCircle className="w-3 h-3" />}
                                {formatDate(project.mockupDue)}
                              </span>
                            </div>
                          )}

                          {project.targetLaunch && (
                            <div
                              className={`flex items-center justify-between ${
                                isLaunchLate ? 'text-[#FF5A5F]' : 'text-[#7CFF6B]'
                              }`}
                            >
                              <span>Launch:</span>
                              <span className="flex items-center gap-1">
                                {isLaunchLate && <AlertCircle className="w-3 h-3" />}
                                {formatDate(project.targetLaunch)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Payment Badges */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#262A40]/40 text-[10px] font-mono">
                          <button
                            onClick={() => onTogglePaymentFlag(project.id, 'depositPaid')}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                              project.depositPaid
                                ? 'bg-[#7CFF6B]/15 border-[#7CFF6B]/40 text-[#7CFF6B]'
                                : 'bg-[#181B2C] border-[#262A40] text-[#A9ADC6]'
                            }`}
                            title="Toggle Deposit"
                          >
                            <Check className="w-2.5 h-2.5" /> Dep
                          </button>

                          <button
                            onClick={() => onTogglePaymentFlag(project.id, 'finalPaid')}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                              project.finalPaid
                                ? 'bg-[#7CFF6B]/15 border-[#7CFF6B]/40 text-[#7CFF6B]'
                                : 'bg-[#181B2C] border-[#262A40] text-[#A9ADC6]'
                            }`}
                            title="Toggle Final"
                          >
                            <Check className="w-2.5 h-2.5" /> Final
                          </button>
                        </div>

                        {/* Checklist Progress */}
                        {(() => {
                          const clientChecklists = checklists.filter((c) => c.clientId === project.clientId);
                          if (clientChecklists.length === 0) return null;
                          const webChk = clientChecklists.find((c) => c.templateId === 'tmpl_website_build') || clientChecklists[0];
                          const { total, completed, percent } = getChecklistProgress(webChk);
                          const isComplete = percent === 100;
                          return (
                            <div className="pt-1.5 border-t border-[#262A40]/40 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-[#A9ADC6]">
                                  <ListChecks className="w-3 h-3 text-[#22D3EE]" />
                                  <span className="truncate max-w-[110px]">{webChk.title.split(':')[0] || 'Checklist'}:</span>
                                </span>
                                <span
                                  className={`font-bold ${
                                    isComplete
                                      ? 'text-[#7CFF6B]'
                                      : percent >= 50
                                      ? 'text-[#22D3EE]'
                                      : 'text-white'
                                  }`}
                                >
                                  {completed}/{total} ({percent}%)
                                </span>
                              </div>
                              <div className="w-full h-1 rounded-full bg-[#11131F] border border-[#262A40] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isComplete
                                      ? 'bg-[#7CFF6B]'
                                      : percent >= 50
                                      ? 'bg-[#22D3EE]'
                                      : 'bg-[#3D5AFE]'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Links */}
                        {(project.previewLink || project.liveLink) && (
                          <div className="flex items-center gap-2 text-[11px]">
                            {project.previewLink && (
                              <a
                                href={project.previewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#22D3EE] hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Preview
                              </a>
                            )}
                            {project.liveLink && (
                              <a
                                href={project.liveLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#7CFF6B] hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Live
                              </a>
                            )}
                          </div>
                        )}

                        {/* Stage Progressions & Edit */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#262A40]/40">
                          <div className="flex items-center gap-1">
                            {stageIndex > 0 && (
                              <button
                                onClick={() =>
                                  onChangeProjectStage(project.id, PROJECT_STAGES[stageIndex - 1])
                                }
                                className="p-1 rounded bg-[#11131F] text-[#A9ADC6] hover:text-white"
                                title="Move back"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {stageIndex < PROJECT_STAGES.length - 1 && (
                              <button
                                onClick={() =>
                                  onChangeProjectStage(project.id, PROJECT_STAGES[stageIndex + 1])
                                }
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3D5AFE]/20 hover:bg-[#3D5AFE] text-[10px] font-mono text-[#3D5AFE] hover:text-white transition-colors"
                                title="Advance Stage"
                              >
                                <span>Next</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditProject(project)}
                              className="p-1 text-[#A9ADC6] hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteProject(project.id)}
                              className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
