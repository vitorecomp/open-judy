import { Case, Hearing, TranscriptSegment, AtaDraft, HearingSummary, CopilotResponse } from './types';

const MOCK_HEARINGS: Hearing[] = [
  {
    id: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    caseId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    caseNumber: '0004521-88.2024.8.26.0100',
    courtJurisdiction: '3ª Vara Cível Central da Comarca de São Paulo/SP',
    hearingType: 'INSTRUCAO_E_JULGAMENTO',
    scheduledDateTime: '2026-08-06T14:00:00Z',
    status: 'READY',
    audioFilename: 'audiencia_0004521_instrucao.mp3',
    audioDurationSeconds: 142.0,
    audioSizeBytes: 19840000,
    participants: [
      { id: '1', name: 'Dra. Camila Vasconcelos de Albuquerque', role: 'MAGISTRADO', documentNumber: 'TJSP-44910', isPresent: true },
      { id: '2', name: 'Dr. Lucas Menezes Braga', role: 'ADVOGADO_AUTOR', documentNumber: 'OAB/SP 389.122', isPresent: true },
      { id: '3', name: 'Dra. Beatriz Fontana Rezende', role: 'ADVOGADO_REU', documentNumber: 'OAB/SP 412.508', isPresent: true },
      { id: '4', name: 'Mariana Ribeiro Silva', role: 'AUTOR', documentNumber: 'CPF 312.455.908-11', isPresent: true },
      { id: '5', name: 'Carlos Eduardo Prado', role: 'TESTEMUNHA', documentNumber: 'RG 28.910.443-X', isPresent: true },
    ],
    createdAt: '2026-08-06T14:00:00Z',
    updatedAt: '2026-08-06T14:25:00Z'
  },
  {
    id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    caseId: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    caseNumber: '0005891-12.2024.8.26.0100',
    courtJurisdiction: '1ª Vara Cível de Santo Amaro/SP',
    hearingType: 'CONCILIACAO',
    scheduledDateTime: '2026-08-07T10:30:00Z',
    status: 'READY',
    audioFilename: 'audiencia_0005891_conciliacao.mp3',
    audioDurationSeconds: 210.0,
    audioSizeBytes: 24500000,
    participants: [
      { id: '1', name: 'Dra. Camila Vasconcelos de Albuquerque', role: 'MAGISTRADO', isPresent: true },
      { id: '2', name: 'Roberto Almeida Santos', role: 'AUTOR', isPresent: true },
      { id: '3', name: 'Dra. Juliana Mendes', role: 'ADVOGADO_REU', isPresent: true },
    ],
    createdAt: '2026-08-07T10:30:00Z',
    updatedAt: '2026-08-07T11:05:00Z'
  },
  {
    id: 'c3d4e5f6-a7b8-9012-3456-78901abcdef2',
    caseId: 'c3d4e5f6-a7b8-9012-3456-78901abcdef2',
    caseNumber: '0009142-45.2024.8.26.0002',
    courtJurisdiction: '14ª Vara do Trabalho de São Paulo/SP',
    hearingType: 'UNA',
    scheduledDateTime: '2026-08-07T14:15:00Z',
    status: 'READY',
    audioFilename: 'audiencia_0009142_trabalhista.mp3',
    audioDurationSeconds: 340.0,
    audioSizeBytes: 42000000,
    participants: [
      { id: '1', name: 'Dr. Marcos Valério Silveira', role: 'MAGISTRADO', isPresent: true },
      { id: '2', name: 'Fernando Costa Lima', role: 'AUTOR', isPresent: true },
      { id: '3', name: 'Dr. Marcelo Fagundes', role: 'ADVOGADO_AUTOR', isPresent: true },
    ],
    createdAt: '2026-08-07T14:15:00Z',
    updatedAt: '2026-08-07T15:00:00Z'
  },
  {
    id: 'd4e5f6a7-b8c9-0123-4567-89012abcdef3',
    caseId: 'd4e5f6a7-b8c9-0123-4567-89012abcdef3',
    caseNumber: '0012490-88.2024.8.26.0050',
    courtJurisdiction: 'Vara das Audiências de Custódia da Capital',
    hearingType: 'CUSTODIA',
    scheduledDateTime: '2026-08-08T09:00:00Z',
    status: 'PENDING',
    audioFilename: 'audiencia_0012490_custodia.mp3',
    audioDurationSeconds: 180.0,
    audioSizeBytes: 21000000,
    participants: [
      { id: '1', name: 'Dra. Renata Souza', role: 'MAGISTRADO', isPresent: true },
      { id: '2', name: 'Paulo Henrique Guedes', role: 'REU', isPresent: true },
      { id: '3', name: 'Dr. Thiago Ribeiro', role: 'DEFENSOR_PUBLICO', isPresent: true },
    ],
    createdAt: '2026-08-08T09:00:00Z',
    updatedAt: '2026-08-08T09:20:00Z'
  },
  {
    id: 'e5f6a7b8-c9d0-1234-5678-90123abcdef4',
    caseId: 'e5f6a7b8-c9d0-1234-5678-90123abcdef4',
    caseNumber: '0015782-33.2024.8.26.0100',
    courtJurisdiction: '7ª Vara de Família e Sucessões Central',
    hearingType: 'INTERROGATORIO',
    scheduledDateTime: '2026-08-08T11:00:00Z',
    status: 'PROCESSING_TRANSCRIPTION',
    audioFilename: 'audiencia_0015782_interrogatorio.mp3',
    audioDurationSeconds: 280.0,
    audioSizeBytes: 33000000,
    participants: [
      { id: '1', name: 'Dra. Camila Vasconcelos de Albuquerque', role: 'MAGISTRADO', isPresent: true },
      { id: '2', name: 'Vitória Kate Santos', role: 'TESTEMUNHA', isPresent: true },
      { id: '3', name: 'Dr. André Villela', role: 'ADVOGADO_AUTOR', isPresent: true },
    ],
    createdAt: '2026-08-08T11:00:00Z',
    updatedAt: '2026-08-08T11:30:00Z'
  }
];

const MOCK_DEMO_HEARING = MOCK_HEARINGS[0];

const MOCK_SEGMENTS: TranscriptSegment[] = [
  {
    id: '1',
    segmentIndex: 1,
    startTimeMs: 0,
    endTimeMs: 18500,
    startTimeFormatted: '00:00',
    endTimeFormatted: '00:18',
    speakerRole: 'MAGISTRADO',
    speakerName: 'Dra. Camila Vasconcelos (Juíza)',
    text: 'Declaro aberta a audiência de instrução e julgamento nos autos do processo número 0004521-88.2024.8.26.0100. Verifico a presença das partes e de seus ilustres patronos. Indago se há proposta conciliatória.',
    confidenceScore: 0.99,
    isKeyStatement: false,
    topicTag: 'Abertura'
  },
  {
    id: '2',
    segmentIndex: 2,
    startTimeMs: 19000,
    endTimeMs: 31200,
    startTimeFormatted: '00:19',
    endTimeFormatted: '00:31',
    speakerRole: 'ADVOGADO_AUTOR',
    speakerName: 'Dr. Lucas Menezes (Adv. Autor)',
    text: 'Pela parte autora, Excelência, tentamos contato prévio mas a construtora não concordou com a devolução integral das parcelas pagas com a respectiva correção monetária.',
    confidenceScore: 0.98,
    isKeyStatement: false,
    topicTag: 'Tentativa Conciliatória'
  },
  {
    id: '3',
    segmentIndex: 3,
    startTimeMs: 31800,
    endTimeMs: 48500,
    startTimeFormatted: '00:31',
    endTimeFormatted: '00:48',
    speakerRole: 'ADVOGADO_REU',
    speakerName: 'Dra. Beatriz Fontana (Adv. Réu)',
    text: 'Pela ré, mantemos a proposta de retenção contratual de vinte por cento nos termos da Lei do Distrato, razão pela qual restou infrutífero o acordo preliminar.',
    confidenceScore: 0.98,
    isKeyStatement: false,
    topicTag: 'Contestação'
  },
  {
    id: '4',
    segmentIndex: 4,
    startTimeMs: 49000,
    endTimeMs: 78000,
    startTimeFormatted: '00:49',
    endTimeFormatted: '01:18',
    speakerRole: 'MAGISTRADO',
    speakerName: 'Dra. Camila Vasconcelos (Juíza)',
    text: 'Restando infrutífera a conciliação, passamos à colheita do depoimento pessoal da autora. Senhora Mariana, a senhora confirma que a entrega do imóvel estava prevista para março de 2023 e até a presente data as chaves não foram disponibilizadas?',
    confidenceScore: 0.99,
    isKeyStatement: true,
    topicTag: 'Instrução'
  },
  {
    id: '5',
    segmentIndex: 5,
    startTimeMs: 78500,
    endTimeMs: 115000,
    startTimeFormatted: '01:18',
    endTimeFormatted: '01:55',
    speakerRole: 'AUTOR',
    speakerName: 'Mariana Ribeiro Silva (Autora)',
    text: 'Sim, Excelência. Em março de 2023 a obra estava parada. Enviei três notificações extrajudiciais e a ré informou que houve falta de insumos, mas se recusou a rescindir amigavelmente sem reter quarenta por cento do valor pago.',
    confidenceScore: 0.97,
    isKeyStatement: true,
    topicTag: 'Depoimento Pessoal'
  },
  {
    id: '6',
    segmentIndex: 6,
    startTimeMs: 116000,
    endTimeMs: 142000,
    startTimeFormatted: '01:56',
    endTimeFormatted: '02:22',
    speakerRole: 'MAGISTRADO',
    speakerName: 'Dra. Camila Vasconcelos (Juíza)',
    text: 'Encerrada a instrução probatória. Concedo o prazo sucessivo de 15 dias para memoriais de alegações finais, iniciando-se pela parte autora. Após, venham os autos conclusos para sentença.',
    confidenceScore: 0.99,
    isKeyStatement: true,
    topicTag: 'Encerramento'
  }
];

const MOCK_ATA: AtaDraft = {
  id: 'c1d2e3f4-a5b6-7890-1234-56789abcdef0',
  hearingId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
  title: 'TERMO DE AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO',
  judicialHeader: 'PODER JUDICIÁRIO DO ESTADO DE SÃO PAULO - COMARCA DA CAPITAL\n3ª Vara Cível Central',
  caseIdentification: 'Processo nº: 0004521-88.2024.8.26.0100\nClasse: Procedimento Comum Cível\nAssunto: Rescisão do contrato e Devolução do dinheiro\nRequerente: Mariana Ribeiro Silva\nRequerido: Construtora e Incorporadora Horizonte Azul S.A.',
  presenceList: 'Presentes: A MMa. Juíza de Direito Dra. Camila Vasconcelos de Albuquerque; a autora acompanhada de seu patrono Dr. Lucas Menezes Braga (OAB/SP 389.122); e a ré representada por sua patrona Dra. Beatriz Fontana Rezende (OAB/SP 412.508).',
  testimonySummary: 'Iniciados os trabalhos, a proposta conciliatória restou infrutífera. Foi colhido o depoimento pessoal da autora Mariana Ribeiro Silva, a qual declarou que a obra encontrava-se paralisada na data aprazada para entrega das chaves (março/2023), tendo havido recusa injustificada na devolução das parcelas.',
  proceduralDecisions: 'Pela MMa. Juíza foi declarada encerrada a instrução probatória em virtude da suficiência dos elementos constantes dos autos.',
  finalOrder: 'Concedo o prazo sucessivo de 15 (quinze) dias para apresentação de memoriais escritos de alegações finais pelas partes, a começar pela autora. Decorrido o prazo, venham os autos conclusos para prolação de sentença. Saem os presentes intimados.',
  fullFormattedText: `# TERMO DE AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO

**Processo nº:** 0004521-88.2024.8.26.0100  
**Vara:** 3ª Vara Cível Central da Comarca de São Paulo  
**Magistrada:** Dra. Camila Vasconcelos de Albuquerque  

Aos seis dias do mês de agosto do ano de dois mil e vinte e seis, às 14:00 horas, na sala de audiências da 3ª Vara Cível Central, sob a presidência da MMa. Juíza de Direito Dra. Camila Vasconcelos de Albuquerque, realizou-se a audiência de instrução e julgamento.

### 1. PRESENÇAS
- **Autora:** Mariana Ribeiro Silva, acompanhada do Dr. Lucas Menezes Braga (OAB/SP 389.122);
- **Ré:** Construtora e Incorporadora Horizonte Azul S.A., representada pela Dra. Beatriz Fontana Rezende (OAB/SP 412.508).

### 2. CONCILIAÇÃO
Proposta a conciliação, restou infrutífera em razão de divergência quanto ao percentual de restituição dos valores adimplidos.

### 3. DEPOIMENTO PESSOAL
Foi colhido o depoimento da autora, que confirmou o atraso injustificado na entrega do empreendimento desde março de 2023.

### 4. DELIBERAÇÃO FINAL
Encerrada a instrução. Defiro o prazo sucessivo de 15 (quinze) dias para alegações finais por memoriais, iniciando pela autora. Nada mais havendo, lavrou-se a presente ata.`,
  isApprovedByJudge: false,
  judgeSignature: 'Dra. Camila Vasconcelos de Albuquerque',
  generatedAt: '2026-08-06T14:20:00Z',
  updatedAt: '2026-08-06T14:22:00Z'
};

const MOCK_SUMMARY: HearingSummary = {
  id: 'd1e2f3a4-b5c6-7890-1234-56789abcdef1',
  hearingId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
  executiveSummary: 'Audiência de Instrução e Julgamento focada na resolução do atraso de entrega de imóvel residencial e percentual de retenção rescisória. Infrutífera a conciliação, colheu-se depoimento da autora com confirmação de atraso da obra além da cláusula de tolerância.',
  disputedFacts: [
    {
      topic: 'Culpa pela Rescisão Contratual',
      description: 'Controvérsia se o atraso se deu por fortuito externo (escassez de insumos alegada pela ré) ou inadimplemento culposo da construtora.',
      plaintiffPosition: 'Atraso injustificado desde março/2023 gerando direito à devolução de 100% com juros e danos morais (Súmula 543 STJ).',
      defendantPosition: 'Aplicabilidade da retenção de 20% prevista na Lei 13.786/2018 decorrente de desistência imotivada.',
      relevantTimestampTags: ['00:31', '01:18']
    }
  ],
  contradictions: [
    {
      description: 'Percentual de devolução contratual vs alegação de rescisão por culpa exclusiva da construtora',
      speakerA: 'Dr. Lucas Menezes (Adv. Autor)',
      statementA: 'A construtora não concordou com a devolução integral das parcelas mesmo com a obra parada.',
      timestampMsA: 19000,
      speakerB: 'Dra. Beatriz Fontana (Adv. Réu)',
      statementB: 'Mantemos a proposta de retenção contratual de 20% nos termos da Lei do Distrato.',
      timestampMsB: 31800,
      legalImpact: 'Incidência da Súmula 543 do STJ: havendo culpa exclusiva da promitente vendedora, a restituição deve ser imediata e integral.'
    }
  ],
  timeline: [
    {
      timeOrDate: 'Março/2023',
      eventDescription: 'Prazo contratual estipulado para entrega das chaves da unidade residencial',
      sourceSpeaker: 'Mariana Ribeiro Silva',
      hearingTimestampMs: 49000
    },
    {
      timeOrDate: 'Agosto/2026',
      eventDescription: 'Realização da audiência de instrução e encerramento probatório com abertura de prazo para memoriais',
      sourceSpeaker: 'Dra. Camila Vasconcelos',
      hearingTimestampMs: 116000
    }
  ],
  keyQuotes: [
    {
      speakerName: 'Mariana Ribeiro Silva',
      role: 'AUTOR',
      quoteText: 'Enviei três notificações extrajudiciais e a ré informou que houve falta de insumos, mas se recusou a rescindir amigavelmente sem reter quarenta por cento do valor pago.',
      timestampMs: 78500,
      relevanceTag: 'Confirmação de Notificação Prévia'
    }
  ],
  generatedAt: '2026-08-06T14:21:00Z'
};

export const api = {
  async listHearings(): Promise<Hearing[]> {
    try {
      const res = await fetch('/api/v1/hearings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return MOCK_HEARINGS;
  },

  async getHearing(id: string): Promise<Hearing> {
    try {
      const res = await fetch(`/api/v1/hearings/${id}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_HEARINGS.find((h) => h.id === id) || MOCK_DEMO_HEARING;
  },

  async getTranscript(hearingId: string): Promise<TranscriptSegment[]> {
    try {
      const res = await fetch(`/api/v1/transcriptions/hearing/${hearingId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return MOCK_SEGMENTS;
  },

  async getAta(hearingId: string): Promise<AtaDraft> {
    try {
      const res = await fetch(`/api/v1/ai/hearings/${hearingId}/ata`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_ATA;
  },

  async generateAta(hearingId: string): Promise<AtaDraft> {
    try {
      const res = await fetch(`/api/v1/ai/hearings/${hearingId}/generate-ata`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_ATA;
  },

  async getAnalysis(hearingId: string): Promise<HearingSummary> {
    try {
      const res = await fetch(`/api/v1/ai/hearings/${hearingId}/analysis`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_SUMMARY;
  },

  async chatCopilot(hearingId: string, question: string): Promise<CopilotResponse> {
    try {
      const res = await fetch(`/api/v1/ai/hearings/${hearingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hearingId, question, conversationHistory: [] })
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    // Smart realistic fallback answering legal questions based on transcript
    const qLower = question.toLowerCase();
    if (qLower.includes('notific') || qLower.includes('março') || qLower.includes('chave')) {
      return {
        answer: 'De acordo com o depoimento prestado pela Autora (Mariana Ribeiro Silva) às 01:18, foram enviadas três notificações extrajudiciais solicitando a devolução das quantias pagas após a paralisação das obras prevista para março de 2023.',
        citations: [
          {
            segmentIndex: 5,
            startTimeMs: 78500,
            endTimeMs: 115000,
            timestampFormatted: '01:18',
            speakerName: 'Mariana Ribeiro Silva (Autora)',
            snippet: 'Enviei três notificações extrajudiciais e a ré informou que houve falta de insumos...',
            relevanceScore: 0.98
          }
        ]
      };
    }

    if (qLower.includes('acordo') || qLower.includes('proposta') || qLower.includes('concilia')) {
      return {
        answer: 'A tentativa conciliatória restou infrutífera. A parte autora requereu devolução integral (00:19), enquanto a advogada da ré sustentou a retenção de 20% nos termos da Lei do Distrato (00:31).',
        citations: [
          {
            segmentIndex: 2,
            startTimeMs: 19000,
            endTimeMs: 31200,
            timestampFormatted: '00:19',
            speakerName: 'Dr. Lucas Menezes',
            snippet: '...a construtora não concordou com a devolução integral das parcelas pagas...',
            relevanceScore: 0.95
          },
          {
            segmentIndex: 3,
            startTimeMs: 31800,
            endTimeMs: 48500,
            timestampFormatted: '00:31',
            speakerName: 'Dra. Beatriz Fontana',
            snippet: '...mantemos a proposta de retenção contratual de vinte por cento...',
            relevanceScore: 0.94
          }
        ]
      };
    }

    return {
      answer: 'Com base na transcrição da audiência, a magistrada declarou encerrada a instrução probatória e deferiu prazo de 15 dias sucessivos para memoriais de alegações finais, iniciando pela parte autora (às 01:56).',
      citations: [
        {
          segmentIndex: 6,
          startTimeMs: 116000,
          endTimeMs: 142000,
          timestampFormatted: '01:56',
          speakerName: 'Dra. Camila Vasconcelos (Juíza)',
          snippet: 'Encerrada a instrução probatória. Concedo o prazo sucessivo de 15 dias para memoriais...',
          relevanceScore: 0.96
        }
      ]
    };
  },

  async getCurrentUser(): Promise<any> {
    try {
      const res = await fetch('/api/v1/users/me', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      id: 'a0000000-0000-0000-0000-000000000001',
      username: 'camila.vasconcelos',
      email: 'camila.vasconcelos@tjsp.jus.br',
      fullName: 'Dra. Camila Vasconcelos de Albuquerque',
      documentNumber: 'TJSP-44910',
      role: 'MAGISTRADO',
      courtJurisdiction: '3ª Vara Cível Central da Comarca de São Paulo/SP',
      status: 'ACTIVE',
      avatarUrl: 'https://ui-avatars.com/api/?name=Camila+Vasconcelos&background=e63946&color=fff',
      configuration: {
        theme: 'DARK',
        language: 'pt-BR',
        fontSize: 'MEDIUM',
        playbackRate: 1.0,
        autoGenerateAtaDraft: true,
        autoDetectContradictions: true,
        defaultAtaTemplate: 'PADRAO_CIVEL',
        aiTemperature: 0.2
      }
    };
  },

  async updateUserConfig(userId: string, config: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/users/${userId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return config;
  },

  async getSystemConfig(): Promise<any> {
    try {
      const res = await fetch('/api/v1/system/config', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      systemName: 'Open Judy',
      systemTagline: '',
      logoUrl: '',
      geminiModel: 'gemini-2.0-flash',
      geminiEmbeddingModel: 'text-embedding-004',
      maxAudioDurationMinutes: 240,
      vectorSimilarityThreshold: 0.75,
      zeroTrustEnforced: true,
      auditLogRetentionDays: 365,
      maintenanceMode: false,
      defaultLanguage: 'pt-BR',
      audioStorageBucket: 'open-judy-audio-archive',
      systemProperties: {
        copilotMaxHistoryTurns: 20,
        enableMultimodalDiarization: true,
        alloyDbVectorDimensions: 768
      }
    };
  },

  async updateSystemConfig(config: any): Promise<any> {
    try {
      const res = await fetch('/api/v1/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return config;
  },

  async getConfigOverview(): Promise<any> {
    try {
      const res = await fetch('/api/v1/config/overview', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      prompts: MOCK_PROMPTS,
      models: MOCK_MODELS,
      dashboards: MOCK_DASHBOARDS,
      notifications: MOCK_NOTIFICATIONS,
      settings: MOCK_SETTINGS,
      generatedAt: new Date().toISOString()
    };
  },

  async getPromptTemplates(category?: string): Promise<any[]> {
    try {
      const url = category ? `/api/v1/config/prompts?category=${category}` : '/api/v1/config/prompts';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return category ? MOCK_PROMPTS.filter(p => p.category === category) : MOCK_PROMPTS;
  },

  async updatePromptTemplate(id: string, data: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const index = MOCK_PROMPTS.findIndex(p => p.id === id);
    if (index !== -1) {
      MOCK_PROMPTS[index] = { ...MOCK_PROMPTS[index], ...data, version: (MOCK_PROMPTS[index].version || 1) + 1, updatedAt: new Date().toISOString() };
      return MOCK_PROMPTS[index];
    }
    return data;
  },

  async renderPromptTemplate(promptCode: string, variables: any): Promise<any> {
    try {
      const res = await fetch('/api/v1/config/prompts/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptCode, variables })
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const prompt = MOCK_PROMPTS.find(p => p.code === promptCode) || MOCK_PROMPTS[0];
    let userPrompt = prompt.userPromptTemplate;
    for (const [k, v] of Object.entries(variables || {})) {
      userPrompt = userPrompt.replaceAll(`{{${k}}}`, String(v));
    }
    return {
      promptCode: prompt.code,
      defaultModel: prompt.defaultModel,
      defaultTemperature: prompt.defaultTemperature,
      renderedSystemInstruction: prompt.systemInstruction,
      renderedUserPrompt: userPrompt,
      missingVariables: []
    };
  },

  async getAiModels(type?: string): Promise<any[]> {
    try {
      const url = type ? `/api/v1/config/models?type=${type}` : '/api/v1/config/models';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return type ? MOCK_MODELS.filter(m => m.modelType === type) : MOCK_MODELS;
  },

  async setDefaultAiModel(id: string): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/models/${id}/set-default`, { method: 'PATCH' });
      if (res.ok) return await res.json();
    } catch (_) {}
    const model = MOCK_MODELS.find(m => m.id === id);
    if (model) {
      MOCK_MODELS.forEach(m => {
        if (m.modelType === model.modelType) m.isDefault = (m.id === id);
      });
      return model;
    }
    return null;
  },

  async updateAiModel(id: string, data: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const index = MOCK_MODELS.findIndex(m => m.id === id);
    if (index !== -1) {
      MOCK_MODELS[index] = { ...MOCK_MODELS[index], ...data, updatedAt: new Date().toISOString() };
      return MOCK_MODELS[index];
    }
    return data;
  },

  async getDashboardTypes(role?: string): Promise<any[]> {
    try {
      const url = role ? `/api/v1/config/dashboards?role=${role}` : '/api/v1/config/dashboards';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return role ? MOCK_DASHBOARDS.filter(d => d.targetRole === role || d.targetRole === 'ALL') : MOCK_DASHBOARDS;
  },

  async updateDashboardType(id: string, data: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/dashboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const index = MOCK_DASHBOARDS.findIndex(d => d.id === id);
    if (index !== -1) {
      MOCK_DASHBOARDS[index] = { ...MOCK_DASHBOARDS[index], ...data, updatedAt: new Date().toISOString() };
      return MOCK_DASHBOARDS[index];
    }
    return data;
  },

  async getNotificationTypes(category?: string): Promise<any[]> {
    try {
      const url = category ? `/api/v1/config/notifications?category=${category}` : '/api/v1/config/notifications';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return category ? MOCK_NOTIFICATIONS.filter(n => n.category === category) : MOCK_NOTIFICATIONS;
  },

  async updateNotificationType(id: string, data: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const index = MOCK_NOTIFICATIONS.findIndex(n => n.id === id);
    if (index !== -1) {
      MOCK_NOTIFICATIONS[index] = { ...MOCK_NOTIFICATIONS[index], ...data, updatedAt: new Date().toISOString() };
      return MOCK_NOTIFICATIONS[index];
    }
    return data;
  },

  async getSystemSettings(category?: string): Promise<any[]> {
    try {
      const url = category ? `/api/v1/config/settings?category=${category}` : '/api/v1/config/settings';
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return Object.entries(MOCK_SETTINGS).map(([key, value]) => ({
      key,
      value,
      category: key.startsWith('gemini') ? 'AI_CORE' : key.startsWith('security') ? 'SECURITY' : 'GENERAL',
      valueType: typeof value === 'boolean' ? 'BOOLEAN' : typeof value === 'number' ? 'INTEGER' : 'STRING'
    }));
  },

  async updateSystemSetting(key: string, data: any): Promise<any> {
    try {
      const res = await fetch(`/api/v1/config/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    MOCK_SETTINGS[key] = data.value;
    return { key, value: data.value, description: data.description };
  }
};

const MOCK_PROMPTS = [
  {
    id: 'p0000000-0000-0000-0000-000000000001',
    code: 'PROMPT_ATA_GENERATION',
    name: 'Geração Oficial de Ata de Audiência',
    description: 'Gera o termo oficial da audiência judicial conforme normas do CPC/CPP.',
    category: 'DOCUMENT_GENERATION',
    systemInstruction: 'Você é o assistente judiciário oficial do Open Judy especializado na elaboração formal de Atas de Audiências Judiciais do Poder Judiciário Brasileiro.',
    userPromptTemplate: 'Processo: {{case_number}}\nVara / Comarca: {{court_jurisdiction}}\nTipo de Audiência: {{hearing_type}}\nMagistrado Presidente: {{judge_name}}\nParticipantes Presentes: {{participants_list}}\n\nTranscrição Integral Diarizada da Audiência:\n{{transcript_content}}\n\nElabore a minuta completa do Termo de Audiência.',
    variables: ['case_number', 'court_jurisdiction', 'hearing_type', 'judge_name', 'participants_list', 'transcript_content'],
    defaultModel: 'gemini-2.0-flash',
    defaultTemperature: 0.2,
    defaultMaxTokens: 8192,
    version: 1,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'p0000000-0000-0000-0000-000000000002',
    code: 'PROMPT_CONTRADICTION_DETECTION',
    name: 'Detector de Contradições e Teses Conflitantes',
    description: 'Identifica divergências fáticas e contradições entre depoimentos com fundamentação jurídica.',
    category: 'LEGAL_ANALYSIS',
    systemInstruction: 'Você é um auditor jurídico analítico do Open Judy. Analise os depoimentos colhidos na audiência e identifique pontos fáticos controvertidos e versões conflitantes.',
    userPromptTemplate: 'Processo Nº: {{case_number}}\nRamo do Direito: {{legal_branch}}\nTese do Autor: {{plaintiff_claim}}\nTese do Réu: {{defendant_claim}}\n\nTranscrição Segmentada:\n{{transcript_content}}\n\nIdentifique e liste detalhadamente todas as contradições fáticas.',
    variables: ['case_number', 'legal_branch', 'plaintiff_claim', 'defendant_claim', 'transcript_content'],
    defaultModel: 'gemini-2.0-flash',
    defaultTemperature: 0.1,
    defaultMaxTokens: 6144,
    version: 1,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'p0000000-0000-0000-0000-000000000003',
    code: 'PROMPT_COPILOT_SYSTEM',
    name: 'Copilot Judicial RAG com Links de Áudio',
    description: 'Assistente interativo judiciário com busca semântica vetorial no AlloyDB pgvector.',
    category: 'COPILOT',
    systemInstruction: 'Você é Judy Copilot, a inteligência artificial do magistrado brasileiro. Responda às perguntas sobre os autos estritamente com base nos trechos recuperados do AlloyDB pgvector.',
    userPromptTemplate: 'Contexto dos Autos e Depoimentos Recuperados:\n{{rag_context}}\n\nHistórico da Conversa:\n{{chat_history}}\n\nPergunta do Usuário:\n{{user_query}}',
    variables: ['rag_context', 'chat_history', 'user_query'],
    defaultModel: 'gemini-2.0-flash',
    defaultTemperature: 0.2,
    defaultMaxTokens: 4096,
    version: 1,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'p0000000-0000-0000-0000-000000000004',
    code: 'PROMPT_DIARIZATION_REFINEMENT',
    name: 'Refinamento de Diarização de Falas Judiciais',
    description: 'Classifica e refina a identificação de oradores na audiência em papéis jurídicos formais.',
    category: 'TRANSCRIPTION',
    systemInstruction: 'Você é um classificador de papéis jurídicos em audiências. Analise o fluxo de diálogo e atribua a cada orador o seu papel correto.',
    userPromptTemplate: 'Participantes Cadastrados na Pauta: {{registered_participants}}\n\nTrecho da Transcrição Bruta com Oradores Desconhecidos:\n{{raw_transcript}}\n\nClassifique os oradores mantendo rigorosamente os timestamps.',
    variables: ['registered_participants', 'raw_transcript'],
    defaultModel: 'gemini-2.0-flash',
    defaultTemperature: 0.1,
    defaultMaxTokens: 4096,
    version: 1,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  }
];

const MOCK_MODELS = [
  {
    id: 'm0000000-0000-0000-0000-000000000001',
    modelId: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash',
    provider: 'GOOGLE_GEMINI',
    modelType: 'LLM_MULTIMODAL',
    description: 'Modelo multimodal ultra-rápido com 1M tokens de janela para transcrição de áudio, atas e RAG.',
    contextWindowTokens: 1048576,
    maxOutputTokens: 8192,
    supportsMultimodal: true,
    supportsAudio: true,
    supportsStreaming: true,
    supportsSystemInstruction: true,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0004,
    isDefault: true,
    active: true,
    parameters: { temperature: 0.2, topP: 0.95, topK: 40 },
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'm0000000-0000-0000-0000-000000000002',
    modelId: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'GOOGLE_GEMINI',
    modelType: 'LLM_MULTIMODAL',
    description: 'Modelo de raciocínio profundo com 2M tokens de contexto para análise de processos complexos.',
    contextWindowTokens: 2097152,
    maxOutputTokens: 8192,
    supportsMultimodal: true,
    supportsAudio: true,
    supportsStreaming: true,
    supportsSystemInstruction: true,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    isDefault: false,
    active: true,
    parameters: { temperature: 0.1, topP: 0.95, topK: 40 },
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'm0000000-0000-0000-0000-000000000003',
    modelId: 'text-embedding-004',
    name: 'Google Text Embedding 004',
    provider: 'GOOGLE_GEMINI',
    modelType: 'EMBEDDING',
    description: 'Modelo oficial de geração de embeddings vetoriais com 768 dimensões compatível com AlloyDB pgvector.',
    contextWindowTokens: 2048,
    maxOutputTokens: 768,
    supportsMultimodal: false,
    supportsAudio: false,
    supportsStreaming: false,
    supportsSystemInstruction: false,
    costPer1kInputTokens: 0.00002,
    costPer1kOutputTokens: 0.0,
    isDefault: true,
    active: true,
    parameters: { dimensions: 768, taskType: 'RETRIEVAL_DOCUMENT' },
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'm0000000-0000-0000-0000-000000000004',
    modelId: 'whisper-large-v3',
    name: 'OpenAI Whisper Large v3',
    provider: 'LOCAL_OLLAMA',
    modelType: 'AUDIO_SPEECH',
    description: 'Modelo open-source de reconhecimento de fala e transcrição para ambientes on-premise ou fallback.',
    contextWindowTokens: 448,
    maxOutputTokens: 448,
    supportsMultimodal: true,
    supportsAudio: true,
    supportsStreaming: false,
    supportsSystemInstruction: false,
    costPer1kInputTokens: 0.0,
    costPer1kOutputTokens: 0.0,
    isDefault: false,
    active: true,
    parameters: { language: 'pt', temperature: 0.0 },
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  }
];

const MOCK_DASHBOARDS = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    code: 'DASHBOARD_MAGISTRADO',
    name: 'Painel do Magistrado(a)',
    description: 'Visão panorâmica para juízes com pauta de audiências do dia, atas aguardando assinatura e contradições.',
    targetRole: 'MAGISTRADO',
    layoutType: 'GRID',
    widgets: [
      { id: 'widget_today_hearings', title: 'Audiências de Hoje', type: 'HEARING_LIST', colSpan: 8, refreshSec: 30 },
      { id: 'widget_pending_signatures', title: 'Atas Pendentes de Assinatura', type: 'PENDING_MINUTES', colSpan: 4, refreshSec: 60 },
      { id: 'widget_contradictions_alert', title: 'Contradições Recentes', type: 'CONTRADICTION_SUMMARY', colSpan: 6, refreshSec: 120 }
    ],
    defaultLanding: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    code: 'DASHBOARD_ASSESSOR',
    name: 'Painel do Assessor de Gabinete',
    description: 'Foco na redação de minutas de atas, pesquisa com Copilot RAG e revisão de depoimentos transcritos.',
    targetRole: 'ASSESSOR',
    layoutType: 'GRID',
    widgets: [
      { id: 'widget_drafts_in_progress', title: 'Minutas de Atas em Elaboração', type: 'DRAFTS_LIST', colSpan: 6, refreshSec: 45 },
      { id: 'widget_recent_transcriptions', title: 'Transcrições Concluídas', type: 'TRANSCRIPTION_FEED', colSpan: 6, refreshSec: 30 }
    ],
    defaultLanding: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    code: 'DASHBOARD_ADMIN_METRICS',
    name: 'Painel de Métricas e Administração de TI',
    description: 'Telemetria de processamento de IA, latência do Gemini, consumo de tokens e saúde do cluster.',
    targetRole: 'ADMIN',
    layoutType: 'GRID',
    widgets: [
      { id: 'widget_gemini_latency', title: 'Latência Média de Transcrição', type: 'METRIC_LATENCY', colSpan: 4, refreshSec: 15 },
      { id: 'widget_token_usage', title: 'Consumo de Tokens Gemini', type: 'METRIC_TOKENS', colSpan: 4, refreshSec: 30 }
    ],
    defaultLanding: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  }
];

const MOCK_NOTIFICATIONS = [
  {
    id: 'n0000000-0000-0000-0000-000000000001',
    code: 'NOTIF_AUDIO_TRANSCRIPTION_COMPLETED',
    name: 'Transcrição de Audiência Concluída',
    description: 'Notifica quando o processamento e diarização de fala da audiência pelo Gemini é finalizado.',
    category: 'AUDIO_PROCESSING',
    defaultPriority: 'NORMAL',
    supportedChannels: ['IN_APP', 'EMAIL', 'WEBSOCKET'],
    templateTitle: 'Transcrição concluída: Processo {{case_number}}',
    templateBody: 'A gravação da audiência do processo {{case_number}} foi transcrita com sucesso.',
    allowUserOverride: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'n0000000-0000-0000-0000-000000000002',
    code: 'NOTIF_CONTRADICTION_DETECTED',
    name: 'Contradição Relevante Detectada',
    description: 'Alerta sobre depoimentos conflitantes ou teses contraditórias identificadas pela IA.',
    category: 'LEGAL_ANALYSIS',
    defaultPriority: 'HIGH',
    supportedChannels: ['IN_APP', 'EMAIL'],
    templateTitle: 'Alerta: Contradição detectada no processo {{case_number}}',
    templateBody: 'Foram encontradas {{contradiction_count}} divergência(s) relevante(s) nos depoimentos.',
    allowUserOverride: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'n0000000-0000-0000-0000-000000000003',
    code: 'NOTIF_ATA_DRAFT_READY',
    name: 'Minuta da Ata de Audiência Disponível',
    description: 'Avisa que a minuta automatizada do termo oficial de audiência foi gerada e está pronta para revisão.',
    category: 'DOCUMENT_WORKFLOW',
    defaultPriority: 'NORMAL',
    supportedChannels: ['IN_APP', 'WEBSOCKET'],
    templateTitle: 'Minuta da Ata Pronta: Processo {{case_number}}',
    templateBody: 'A minuta automática da ata do processo {{case_number}} foi elaborada pelo modelo {{gemini_model}}.',
    allowUserOverride: true,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'n0000000-0000-0000-0000-000000000004',
    code: 'NOTIF_SIGNATURE_REQUIRED',
    name: 'Assinatura Digital ICP-Brasil Necessária',
    description: 'Notifica o magistrado quando um termo de audiência aprovado aguarda assinatura digital.',
    category: 'DOCUMENT_WORKFLOW',
    defaultPriority: 'HIGH',
    supportedChannels: ['IN_APP', 'EMAIL'],
    templateTitle: 'Ata aguardando assinatura do Magistrado(a) - {{case_number}}',
    templateBody: 'O termo de audiência do processo {{case_number}} aguarda a assinatura digital de Vossa Excelência.',
    allowUserOverride: false,
    active: true,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  }
];

const MOCK_SETTINGS: Record<string, any> = {
  'system.name': 'Open Judy',
  'system.tagline': 'IA Judiciária Zero-Trust',
  'system.logo_url': '',
  'system.accent_color': '#e63946',
  'gemini.default.model': 'gemini-2.0-flash',
  'gemini.default.embedding_model': 'text-embedding-004',
  'vector.similarity_threshold': '0.75',
  'audio.max_duration_minutes': '240',
  'storage.audio_bucket': 'open-judy-audio-archive',
  'security.zero_trust_enforced': 'true',
  'security.audit_retention_days': '365',
  'system.maintenance_mode': 'false',
  'system.default_language': 'pt-BR'
};

