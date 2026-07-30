export interface BioInfo {
  name?: string;
  title?: string;
  location?: string;
  phone?: string;
  email?: string;
  github?: string;
  linkedin?: string;
  rawList?: string[];
}

export interface ExperienceItem {
  title: string;
  description: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  years?: string;
  relevant_coursework?: string[];
}

export interface ResumeContent {
  "Bio Info"?: string[];
  summary?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: string[];
}

export interface UploadResponse {
  s3_key: string;
  resume_id: string;
  content: ResumeContent;
  message: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  session_id?: string;
  isUploadAck?: boolean;
  resumeData?: UploadResponse;
}

export interface SessionInfo {
  id: string;
  title: string;
  updatedAt: Date;
  roleTag?: string;
}
