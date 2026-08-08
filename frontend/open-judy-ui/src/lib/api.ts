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
  }
};

