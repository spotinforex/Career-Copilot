import React, { useState } from 'react';
import { ResumeContent, UploadResponse } from '../types';
import { User, Briefcase, GraduationCap, Award, Code2, Mail, Phone, MapPin, Github, Linkedin, Code, FileText, ChevronRight, Sparkles, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { downloadPdfFromResumeData } from '../utils/pdfGenerator';

interface ResumeWorkspaceProps {
  resumeData: UploadResponse | null;
  onOpenUpload: () => void;
  activeRoleTag: string;
}

// Helper to safely parse experience & project items from any backend JSON structure
function extractExperiences(content: any): Array<{ title: string; subtitle?: string; description: string }> {
  const rawList =
    content.experience ||
    content.experiences ||
    content.projects ||
    content.work_experience ||
    content['Key Projects & Experience'] ||
    [];

  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return { title: `Experience #${idx + 1}`, description: item };
    }

    if (typeof item === 'object' && item !== null) {
      const title =
        item.title ||
        item.Title ||
        item.role ||
        item.Role ||
        item.name ||
        item.Name ||
        item.position ||
        item.Position ||
        item.project ||
        item.project_name ||
        item.company ||
        item.Company ||
        `Project / Role #${idx + 1}`;

      const subtitle =
        item.company ||
        item.Company ||
        item.organization ||
        item.dates ||
        item.years ||
        item.period ||
        item.date ||
        undefined;

      let description =
        item.description ||
        item.Description ||
        item.details ||
        item.Details ||
        item.summary ||
        item.Summary ||
        item.responsibilities ||
        item.highlights ||
        item.bullet_points ||
        item.bullets;

      if (Array.isArray(description)) {
        description = description.join('\n• ');
      } else if (typeof description === 'object' && description !== null) {
        description = JSON.stringify(description);
      } else if (!description) {
        // Fallback: collect any remaining string values in the object that aren't the title
        const otherValues = Object.entries(item)
          .filter(([k, v]) => typeof v === 'string' && v !== title && v !== subtitle)
          .map(([k, v]) => `${k}: ${v}`);
        description = otherValues.length > 0 ? otherValues.join('\n') : '';
      }

      return {
        title: String(title),
        subtitle: subtitle ? String(subtitle) : undefined,
        description: String(description),
      };
    }

    return { title: `Item #${idx + 1}`, description: String(item) };
  });
}

// Helper to safely parse education items
function extractEducation(content: any): Array<{ degree: string; institution: string; years?: string; relevant_coursework?: string[] }> {
  const rawList =
    content.education ||
    content.educations ||
    content.academic ||
    content['Education'] ||
    [];

  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return { degree: item, institution: 'Academic History' };
    }

    if (typeof item === 'object' && item !== null) {
      const degree =
        item.degree ||
        item.Degree ||
        item.title ||
        item.name ||
        item.field ||
        `Education #${idx + 1}`;

      const institution =
        item.institution ||
        item.Institution ||
        item.school ||
        item.School ||
        item.university ||
        '';

      const years = item.years || item.Years || item.date || item.dates || item.period;

      let coursework: string[] | undefined = undefined;
      if (Array.isArray(item.relevant_coursework)) coursework = item.relevant_coursework;
      else if (Array.isArray(item.coursework)) coursework = item.coursework;
      else if (Array.isArray(item.courses)) coursework = item.courses;

      return {
        degree: String(degree),
        institution: String(institution),
        years: years ? String(years) : undefined,
        relevant_coursework: coursework,
      };
    }

    return { degree: String(item), institution: '' };
  });
}

export const ResumeWorkspace: React.FC<ResumeWorkspaceProps> = ({
  resumeData,
  onOpenUpload,
  activeRoleTag,
}) => {
  const [activeTab, setActiveTab] = useState<'parsed' | 'skills' | 'raw'>('parsed');
  const [skillSearch, setSkillSearch] = useState('');

  if (!resumeData || !resumeData.content) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 border-l border-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-1">No Resume in Memory</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Upload your resume to hydrate Career Copilot's persistent memory with your experience, projects, and skills.
        </p>
        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          Upload Resume Now
        </button>
      </div>
    );
  }

  const content: ResumeContent = resumeData.content;
  const bioList = content['Bio Info'] || (content as any).bio_info || [];

  // Parse bio key-values from string array e.g. "Name: Praisejah Nwabeke"
  const bioMap: Record<string, string> = {};
  if (Array.isArray(bioList)) {
    bioList.forEach((item) => {
      if (typeof item === 'string') {
        const parts = item.split(': ');
        if (parts.length >= 2) {
          bioMap[parts[0].toLowerCase()] = parts.slice(1).join(': ');
        } else {
          bioMap['info'] = item;
        }
      }
    });
  }

  const name = bioMap['name'] || (content as any).name || 'Candidate Profile';
  const title = bioMap['title'] || (content as any).title || activeRoleTag;
  const location = bioMap['location'] || (content as any).location;
  const phone = bioMap['phone'] || (content as any).phone;
  const email = bioMap['email'] || (content as any).email;
  const github = bioMap['github'] || (content as any).github;
  const linkedin = bioMap['linkedin'] || (content as any).linkedin;

  const experiences = extractExperiences(content);
  const educationList = extractEducation(content);
  const summaryText = content.summary || (content as any).Executive_Summary || (content as any).bio;

  const filteredSkills = (content.skills || (content as any).Skills || []).filter((sk: any) =>
    typeof sk === 'string' && sk.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <aside className="h-full flex flex-col bg-slate-50/60 border-l border-slate-200 overflow-hidden text-slate-800">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 leading-tight">Agent Memory</h2>
              <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Active Context • {activeRoleTag}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => downloadPdfFromResumeData(resumeData, activeRoleTag)}
              title="Download PDF"
              className="p-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onOpenUpload}
              title="Upload new resume version"
              className="p-1.5 text-xs text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Update</span>
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('parsed')}
            className={`flex-1 py-1.5 px-2 rounded-md transition ${
              activeTab === 'parsed'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex-1 py-1.5 px-2 rounded-md transition ${
              activeTab === 'skills'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Skills ({content.skills?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex-1 py-1.5 px-2 rounded-md transition ${
              activeTab === 'raw'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'parsed' && (
          <>
            {/* Candidate Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{name}</h3>
                  <p className="text-xs font-medium text-indigo-600">{title}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Parsed
                </span>
              </div>

              {/* Contact Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                {email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{phone}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-indigo-600 hover:underline truncate"
                  >
                    <Github className="h-3.5 w-3.5 shrink-0" />
                    <span>GitHub</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-indigo-600 hover:underline truncate"
                  >
                    <Linkedin className="h-3.5 w-3.5 shrink-0" />
                    <span>LinkedIn</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            {summaryText && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Executive Summary
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{summaryText}</p>
              </div>
            )}

            {/* Experience Timeline */}
            {experiences.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                  Key Projects & Experience ({experiences.length})
                </h4>
                <div className="space-y-3 divide-y divide-slate-100">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900 leading-snug">
                          {exp.title}
                        </h5>
                        {exp.subtitle && (
                          <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                            {exp.subtitle}
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education & Academic */}
            {educationList.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                  Education
                </h4>
                {educationList.map((edu, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{edu.degree}</span>
                      {edu.years && <span className="text-[11px] font-normal text-slate-500">{edu.years}</span>}
                    </div>
                    {edu.institution && <p className="text-xs text-indigo-700 font-medium">{edu.institution}</p>}
                    {edu.relevant_coursework && edu.relevant_coursework.length > 0 && (
                      <div className="pt-1.5 flex flex-wrap gap-1">
                        {edu.relevant_coursework.map((course, cIdx) => (
                          <span
                            key={cIdx}
                            className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          >
                            {course}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                Extracted Skills Inventory
              </h4>
              <span className="text-xs font-semibold text-indigo-600">
                {filteredSkills.length} items
              </span>
            </div>

            <input
              type="text"
              placeholder="Search skills (e.g. Python, Docker, SQL)..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex flex-wrap gap-1.5 pt-1 max-h-[450px] overflow-y-auto">
              {filteredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 text-xs font-medium px-2.5 py-1 rounded-lg transition"
                >
                  {skill}
                </span>
              ))}
              {filteredSkills.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center w-full">No skills match search</p>
              )}
            </div>
          </div>
        )}

        {/* Raw JSON Memory */}
        {activeTab === 'raw' && (
          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-slate-400 font-sans text-xs">Session Memory Object</span>
              <span className="text-emerald-400 text-[10px]">ID: {resumeData.resume_id || 'active'}</span>
            </div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(resumeData, null, 2)}</pre>
          </div>
        )}
      </div>
    </aside>
  );
};
