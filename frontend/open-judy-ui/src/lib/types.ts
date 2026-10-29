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
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'PROCESSING_TRANSCRIPTION'
  | 'TRANSCRIPTION_COMPLETED'
  | 'PROCESSING_SUMMARY'
  | 'GENERATING_ANALYSIS'
  | 'ANALYSIS_COMPLETED'
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

export type DocumentType =
  | 'PETICAO_INICIAL'
  | 'CONTESTACAO'
  | 'PROCURACAO'
  | 'LAUDO_TECNICO'
  | 'PROVA_DOCUMENTAL'
  | 'DESPACHO'
  | 'DECISAO_INTERLOCUTORIA'
  | 'ATA_AUDIENCIA'
  | 'SENTENCA'
  | 'RECURSO'
  | 'CERTIDAO'
  | 'OUTROS';

export interface CaseDocument {
  id: string;
  caseId: string;
  title: string;
  documentType: DocumentType;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  storageUri?: string;
  pageCount?: number;
  ocrStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedText?: string;
  uploadedBy?: string;
  uploadedAt: string;
  updatedAt: string;
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
  status?: string;
  documents?: CaseDocument[];
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
  blockIndex?: number;
}

export type TranscriptBlockStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranscriptBlock {
  id: string;
  hearingId: string;
  blockIndex: number;
  title: string;
  startTimeMs: number;
  endTimeMs: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  estimatedTokens: number;
  segmentCount: number;
  summary?: string;
  processingDurationMs?: number;
  status?: TranscriptBlockStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  paddingSeconds?: number;
  contextSegmentsCount?: number;
  promptVersion?: string;
  pipelineVersion?: string;
}

export interface HearingTelemetryStats {
  completedBlocks: number;
  totalBlocks?: number;
  processingBlockIndex?: number | null;
  processingStartedAt?: string | null;
  totalProcessingMs: number;
  lastCompletedAt?: string | null;
  recentBlockDurationsMs: number[];
  averageBlockDurationMs: number;
}

export interface PipelineTelemetrySummary {
  averagePartDurationMs: number;
  recentPartDurationsMs: number[];
  hearings: Record<string, HearingTelemetryStats>;
}

export type NotebookSourceType =
  | 'VIDEO_BLOCK'
  | 'HEARING_TRANSCRIPT'
  | 'CASE_PETICAO'
  | 'DOCUMENT_PDF'
  | 'JURISPRUDENCE'
  | 'CUSTOM_TEXT';

export interface NotebookSource {
  id: string;
  notebookId: string;
  sourceType: NotebookSourceType;
  title: string;
  referenceId?: string;
  blockIndex?: number;
  content?: string;
  estimatedTokens: number;
  isActiveForChat: boolean;
  createdAt: string;
}

export interface NotebookNote {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  noteType: 'NOTE' | 'DRAFT_DESPACHO' | 'DRAFT_SENTENCA' | 'FINDING';
  createdAt: string;
  updatedAt: string;
}

export interface NotebookChatMessage {
  id: string;
  notebookId: string;
  role: 'user' | 'assistant';
  content: string;
  activeSourceTitles?: string[];
  citations?: {
    sourceTitle: string;
    snippet: string;
    referenceUrl?: string;
  }[];
  tokensUsed?: number;
  createdAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  description?: string;
  userId?: string;
  caseId?: string;
  caseNumber?: string;
  emoji: string;
  color: string;
  sources: NotebookSource[];
  notes: NotebookNote[];
  totalActiveTokens: number;
  createdAt: string;
  updatedAt: string;
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
  severity?: string;
  confidence?: number;
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
  status?: string;
  promptVersion?: string;
  generatedAt: string;
}

export type MediaType = 'AUDIO' | 'VIDEO';

export interface Hearing {
  id: string;
  caseId: string;
  caseNumber: string;
  courtJurisdiction: string;
  hearingType: HearingType;
  scheduledDateTime: string;
  status: AudioProcessingStatus;
  mediaType?: MediaType;
  mediaUrl?: string;
  mediaFilename?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioFilename?: string;
  audioDurationSeconds?: number;
  audioSizeBytes?: number;
  participants: Participant[];
  transcriptSegments?: TranscriptSegment[];
  ataDraft?: AtaDraft;
  summary?: HearingSummary;
  promptVersion?: string;
  pipelineVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  segmentIndex?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  timestampFormatted?: string;
  speakerName?: string;
  snippet?: string;
  relevanceScore?: number;
  title?: string;
  uri?: string;
  court?: string;
  precedentNumber?: string;
  confidenceScore?: number;
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
  accentColor?: string;
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
  hearingsViewMode?: 'TABLE' | 'CARDS';
  customPreferences?: Record<string, any>;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  keycloakId?: string;
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
  systemName?: string;
  systemTagline?: string;
  logoUrl?: string;
  accentColor?: string;
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

export type PromptCategory =
  | 'DOCUMENT_GENERATION'
  | 'LEGAL_ANALYSIS'
  | 'COPILOT'
  | 'TRANSCRIPTION'
  | 'SUMMARIZATION'
  | 'GENERAL';

export interface PromptTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: PromptCategory;
  systemInstruction?: string;
  userPromptTemplate: string;
  variables: string[];
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AiModelProvider =
  | 'GOOGLE_GEMINI'
  | 'VERTEX_AI'
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'LOCAL_OLLAMA';

export type AiModelType =
  | 'LLM_MULTIMODAL'
  | 'LLM_TEXT'
  | 'EMBEDDING'
  | 'AUDIO_SPEECH'
  | 'RERANKER';

export interface AiModel {
  id: string;
  modelId: string;
  name: string;
  provider: AiModelProvider;
  modelType: AiModelType;
  description?: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  supportsMultimodal: boolean;
  supportsAudio: boolean;
  supportsStreaming: boolean;
  supportsSystemInstruction: boolean;
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
  isDefault: boolean;
  active: boolean;
  parameters?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardType {
  id: string;
  code: string;
  name: string;
  description?: string;
  targetRole: string;
  layoutType: string;
  widgets: Array<Record<string, any>>;
  defaultLanding: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationCategory =
  | 'AUDIO_PROCESSING'
  | 'LEGAL_ANALYSIS'
  | 'DOCUMENT_WORKFLOW'
  | 'SECURITY_AUDIT'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WEBSOCKET' | 'WEBHOOK';

export interface NotificationType {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  defaultPriority: NotificationPriority;
  supportedChannels: NotificationChannel[];
  templateTitle: string;
  templateBody: string;
  allowUserOverride: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  valueType: string;
  description?: string;
  isSecret: boolean;
  isReadOnly: boolean;
  updatedAt: string;
}

export interface SystemConfigOverview {
  prompts: PromptTemplate[];
  models: AiModel[];
  dashboards: DashboardType[];
  notifications: NotificationType[];
  settings: Record<string, string>;
  generatedAt: string;
}

export interface JudicialNotification {
  id: string;
  userId?: string;
  targetRole?: string;
  title: string;
  message: string;
  category: 'AUDIO_PROCESSING' | 'LEGAL_ANALYSIS' | 'DOCUMENT_WORKFLOW' | 'SECURITY_AUDIT' | 'SYSTEM';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

export interface EnterpriseAgent {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  agentType: 'GEMINI_ENTERPRISE_USER_AGENT' | 'A2A' | 'ADK' | 'DIALOGFLOW_CX' | 'MCP_SERVER';
  capabilities: string[];
  dataStores: string[];
  systemInstruction?: string;
  defaultModel?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  isDefault?: boolean;
  createdAt?: string;
}

export interface StreamAssistChunk {
  eventType: 'PLANNER_STEP' | 'GROUNDED_CHUNK' | 'CITATION' | 'COMPLETE' | 'ERROR';
  text?: string;
  plannerStep?: string;
  planStepId?: string;
  sessionId?: string;
  agentId?: string;
  citations?: Citation[];
  timestamp?: string;
}

export interface AgentGardenSession {
  sessionId: string;
  gcpSessionPath?: string;
  agentId: string;
  title: string;
  turnCount: number;
  createdAt: string;
  lastActiveAt: string;
  queryHistory: string[];
}

export interface UnifiedSearchResultItem {
  id: string;
  entityType:
    | 'CASE'
    | 'CASE_DOCUMENT'
    | 'HEARING_TRANSCRIPT'
    | 'HEARING_CHAT'
    | 'ATA_DRAFT'
    | 'LEGAL_ANALYSIS'
    | 'AGENT_KNOWLEDGE'
    | 'AGENT_CONVERSATION'
    | 'NOTEBOOK_CONVERSATION';
  title: string;
  caseNumber?: string;
  courtJurisdiction?: string;
  highlightSnippet?: string;
  score?: number;
  targetUrl: string;
  speakerName?: string;
  metadata?: Record<string, any>;
  indexedAt?: string;
}

export interface UnifiedSearchResponse {
  query: string;
  totalHits: number;
  tookMs: number;
  results: UnifiedSearchResultItem[];
  facets?: Record<string, number>;
}

export type AsyncTaskType =
  | 'TRANSCRIPTION'
  | 'LEGAL_ANALYSIS'
  | 'INDEXING'
  | 'TIMESTAMP_REPAIR'
  | 'REPROCESS';

export type AsyncTaskStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'RETRYING_429'
  | 'COMPLETED'
  | 'FAILED';

export interface AsyncTask {
  id: string;
  taskType: AsyncTaskType | string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  queueName: string;
  routingKey?: string;
  status: AsyncTaskStatus | string;
  progressPct: number;
  promptVersion?: string;
  pipelineVersion?: string;
  workerId?: string;
  retryCount?: number;
  triggeredBy?: string;
  payloadJson?: Record<string, any> | string;
  resultSummary?: string;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface RabbitMqQueueInfo {
  name: string;
  description?: string;
  messagesReady: number;
  messagesUnacknowledged: number;
  messagesTotal: number;
  consumers: number;
  state: 'RUNNING' | 'IDLE' | 'DEGRADED' | string;
  exchange?: string;
  routingKey?: string;
}

export interface RabbitMqBrokerStatus {
  brokerName: string;
  host: string;
  amqpPort: number;
  managementPort: number;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | string;
  queues: RabbitMqQueueInfo[];
  checkedAt: string;
}

export interface TaskStats {
  totalTasks: number;
  queuedTasks: number;
  processingTasks: number;
  retrying429Tasks: number;
  completedTasks: number;
  failedTasks: number;
  byType: Record<string, number>;
}

export type AuditCategory =
  | 'TASK'
  | 'HEARING'
  | 'CASE'
  | 'ADMIN_CONFIG'
  | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: AuditCategory | string;
  entityType: string;
  entityId: string;
  entityName: string;
  status: string;
  rabbitmqQueue?: string | null;
  detailsJson?: Record<string, any> | string | null;
}

export interface AuditStats {
  totalEvents: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  lastEventAt?: string | null;
}




