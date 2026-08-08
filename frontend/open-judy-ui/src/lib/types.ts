export type ParticipantRole =
  | 'MAGISTRADO'
  | 'PROMOTOR'
  | 'DEFENSOR_PUBLICO'
  | 'ADVOGADO_AUTOR'
  | 'ADVOGADO_REU'
  | 'AUTOR'
  | 'REU'
  | 'TESTEMUNHA'
  | 'PERITO'
  | 'ESCRIVAO'
  | 'OUTRO';

export type HearingType =
  | 'INSTRUCAO_E_JULGAMENTO'
  | 'CONCILIACAO'
  | 'CUSTODIA'
  | 'PRELIMINAR'
  | 'UNA'
  | 'INTERROGATORIO'
  | 'OUTRO';

export type AudioProcessingStatus =
  | 'PENDING'
  | 'UPLOADED'
  | 'PROCESSING_TRANSCRIPTION'
  | 'TRANSCRIPTION_COMPLETED'
  | 'GENERATING_ANALYSIS'
  | 'READY'
  | 'FAILED';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  documentNumber?: string;
  email?: string;
  notes?: string;
  isPresent: boolean;
}

export interface Case {
  id: string;
  caseNumber: string;
  courtJurisdiction: string;
  legalBranch: string;
  subject: string;
  plaintiffName: string;
  defendantName: string;
  judgeName: string;
  prosecutorName?: string;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  speakerRole: ParticipantRole;
  speakerName: string;
  text: string;
  confidenceScore: number;
  isKeyStatement: boolean;
  topicTag?: string;
}

export interface AtaDraft {
  id: string;
  hearingId: string;
  title: string;
  judicialHeader: string;
  caseIdentification: string;
  presenceList: string;
  testimonySummary: string;
  proceduralDecisions: string;
  finalOrder: string;
  fullFormattedText: string;
  isApprovedByJudge: boolean;
  judgeSignature?: string;
  generatedAt: string;
  updatedAt: string;
}

export interface DisputedFact {
  topic: string;
  description: string;
  plaintiffPosition: string;
  defendantPosition: string;
  relevantTimestampTags: string[];
}

export interface Contradiction {
  description: string;
  speakerA: string;
  statementA: string;
  timestampMsA: number;
  speakerB: string;
  statementB: string;
  timestampMsB: number;
  legalImpact: string;
}

export interface TimelineEvent {
  timeOrDate: string;
  eventDescription: string;
  sourceSpeaker: string;
  hearingTimestampMs: number;
}

export interface KeyQuote {
  speakerName: string;
  role: string;
  quoteText: string;
  timestampMs: number;
  relevanceTag: string;
}

export interface HearingSummary {
  id: string;
  hearingId: string;
  executiveSummary: string;
  disputedFacts: DisputedFact[];
  contradictions: Contradiction[];
  timeline: TimelineEvent[];
  keyQuotes: KeyQuote[];
  generatedAt: string;
}

export interface Hearing {
  id: string;
  caseId: string;
  caseNumber: string;
  courtJurisdiction: string;
  hearingType: HearingType;
  scheduledDateTime: string;
  status: AudioProcessingStatus;
  audioUrl?: string;
  audioFilename?: string;
  audioDurationSeconds?: number;
  audioSizeBytes?: number;
  participants: Participant[];
  transcriptSegments?: TranscriptSegment[];
  ataDraft?: AtaDraft;
  summary?: HearingSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  segmentIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  timestampFormatted: string;
  speakerName: string;
  snippet: string;
  relevanceScore: number;
}

export interface CopilotResponse {
  answer: string;
  citations: Citation[];
}

export type UserRole =
  | 'ADMIN'
  | 'MAGISTRADO'
  | 'ASSESSOR'
  | 'ACESSOR'
  | 'PROMOTOR'
  | 'DEFENSOR_PUBLICO'
  | 'ADVOGADO'
  | 'ESCRIVAO'
  | 'ANALISTA_JUDICIARIO'
  | 'USUARIO_EXTERNO';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';

export interface UserPermissions {
  canSignMinutes: boolean;
  canApproveAta: boolean;
  canDraftAta: boolean;
  canManageUsers: boolean;
  canEditSystemConfig: boolean;
  canAnalyzeHearings: boolean;
  canConductHearing: boolean;
}

export function getUserPermissions(role?: UserRole | string): UserPermissions {
  const normalized = (role || 'ASSESSOR').toUpperCase();
  if (normalized === 'ADMIN') {
    return {
      canSignMinutes: true,
      canApproveAta: true,
      canDraftAta: true,
      canManageUsers: true,
      canEditSystemConfig: true,
      canAnalyzeHearings: true,
      canConductHearing: true,
    };
  }
  if (normalized === 'MAGISTRADO' || normalized === 'MAGISTRADA' || normalized === 'JUIZ') {
    return {
      canSignMinutes: true,
      canApproveAta: true,
      canDraftAta: true,
      canManageUsers: false,
      canEditSystemConfig: false,
      canAnalyzeHearings: true,
      canConductHearing: true,
    };
  }
  // Default to ASSESSOR / ACESSOR
  return {
    canSignMinutes: false,
    canApproveAta: false,
    canDraftAta: true,
    canManageUsers: false,
    canEditSystemConfig: false,
    canAnalyzeHearings: true,
    canConductHearing: false,
  };
}

export function getRoleDisplayName(role?: UserRole | string): string {
  const normalized = (role || 'ASSESSOR').toUpperCase();
  if (normalized === 'ADMIN') return 'Administrador';
  if (normalized === 'MAGISTRADO' || normalized === 'MAGISTRADA') return 'Magistrada';
  if (normalized === 'ASSESSOR' || normalized === 'ACESSOR' || normalized === 'ASSESSORA') return 'Assessor de Gabinete';
  return role || 'Usuário';
}

export interface UserConfiguration {
  id?: string;
  userId: string;
  theme: string;
  language: string;
  fontSize: string;
  highContrast: boolean;
  compactView: boolean;
  defaultLandingPage: string;
  playbackRate: number;
  autoPlayNextSegment: boolean;
  autoScrollTranscript: boolean;
  showWaveform: boolean;
  skipSilence: boolean;
  defaultSkipSeconds: number;
  autoGenerateAtaDraft: boolean;
  autoDetectContradictions: boolean;
  defaultAtaTemplate: string;
  aiTemperature: number;
  enableCopilotSuggestions: boolean;
  citationStyle: string;
  emailNotifications: boolean;
  hearingCompletedAlert: boolean;
  contradictionDetectedAlert: boolean;
  ataReadyAlert: boolean;
  dailyDigest: boolean;
  digitalCertificateSubject?: string;
  autoSignApprovedMinutes: boolean;
  judgeSignatureTitle?: string;
  customPreferences?: Record<string, any>;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  documentNumber?: string;
  role: UserRole;
  courtJurisdiction?: string;
  status: UserStatus;
  avatarUrl?: string;
  configuration?: UserConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfiguration {
  id?: string;
  geminiModel: string;
  geminiEmbeddingModel: string;
  maxAudioDurationMinutes: number;
  vectorSimilarityThreshold: number;
  zeroTrustEnforced: boolean;
  auditLogRetentionDays: number;
  maintenanceMode: boolean;
  defaultLanguage: string;
  audioStorageBucket: string;
  systemProperties?: Record<string, any>;
  updatedAt?: string;
}



