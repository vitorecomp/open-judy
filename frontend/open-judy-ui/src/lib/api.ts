import {
  Case,
  Hearing,
  TranscriptSegment,
  AtaDraft,
  HearingSummary,
  CopilotResponse,
  JudicialNotification,
  TranscriptBlock,
  Notebook,
  NotebookSource,
  NotebookNote,
  NotebookChatMessage
} from './types';

const MOCK_BLOCKS: TranscriptBlock[] = [
  {
    id: 'blk-0001-0000-0000-000000000001',
    hearingId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    blockIndex: 1,
    title: 'Bloco 1: Abertura e Tentativa de Conciliação',
    startTimeMs: 0,
    endTimeMs: 48500,
    startTimeFormatted: '00:00',
    endTimeFormatted: '00:48',
    estimatedTokens: 252000,
    segmentCount: 3,
    summary: 'Abertura formal dos trabalhos, verificação dos patronos presentes e frustração da proposta de acordo civil.'
  },
  {
    id: 'blk-0001-0000-0000-000000000002',
    hearingId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    blockIndex: 2,
    title: 'Bloco 2: Saneamento e Depoimento da Autora',
    startTimeMs: 49000,
    endTimeMs: 115000,
    startTimeFormatted: '00:49',
    endTimeFormatted: '01:55',
    estimatedTokens: 256000,
    segmentCount: 2,
    summary: 'Fixação judicial dos pontos controvertidos e tomada do depoimento pessoal da autora sobre as notificações.'
  },
  {
    id: 'blk-0001-0000-0000-000000000003',
    hearingId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    blockIndex: 3,
    title: 'Bloco 3: Encerramento da Instrução e Memoriais',
    startTimeMs: 116000,
    endTimeMs: 142000,
    startTimeFormatted: '01:56',
    endTimeFormatted: '02:22',
    estimatedTokens: 248000,
    segmentCount: 1,
    summary: 'Encerramento formal da instrução e concessão de 15 dias sucessivos para memoriais de alegações finais.'
  }
];

const MOCK_HEARINGS: Hearing[] = [
  {
    id: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    caseId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    caseNumber: '0004521-88.2024.8.26.0100',
    courtJurisdiction: '3ª Vara Cível Central da Comarca de São Paulo/SP',
    hearingType: 'INSTRUCAO_E_JULGAMENTO',
    scheduledDateTime: '2026-08-06T14:00:00Z',
    status: 'READY',
    mediaType: 'VIDEO',
    mediaFilename: 'audiencia_0004521_instrucao.mp4',
    videoUrl: '',
    audioFilename: 'audiencia_0004521_instrucao.mp4',
    audioDurationSeconds: 142.0,
    audioSizeBytes: 48500000,
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
    mediaType: 'AUDIO',
    mediaFilename: 'audiencia_0005891_conciliacao.mp3',
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
    mediaType: 'VIDEO',
    mediaFilename: 'audiencia_0009142_trabalhista.webm',
    videoUrl: '',
    audioFilename: 'audiencia_0009142_trabalhista.webm',
    audioDurationSeconds: 340.0,
    audioSizeBytes: 89000000,
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
    mediaType: 'VIDEO',
    mediaFilename: 'audiencia_0012490_custodia.mp4',
    videoUrl: '',
    audioFilename: 'audiencia_0012490_custodia.mp4',
    audioDurationSeconds: 180.0,
    audioSizeBytes: 42000000,
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
    mediaType: 'VIDEO',
    mediaFilename: 'audiencia_0015782_interrogatorio.mp4',
    videoUrl: '',
    audioFilename: 'audiencia_0015782_interrogatorio.mp4',
    audioDurationSeconds: 280.0,
    audioSizeBytes: 75000000,
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

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('openjudy_keycloak_token');
    const profile = localStorage.getItem('openjudy_active_profile');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (profile) {
      headers['X-Dev-Mock-User'] = profile;
    }
  }
  return headers;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customHeaders = (options.headers as Record<string, string>) || {};
  return fetch(url, {
    ...options,
    headers: getAuthHeaders(customHeaders),
  });
}

export const api = {
  async listHearings(): Promise<Hearing[]> {
    try {
      const res = await authFetch('/api/v1/hearings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return MOCK_HEARINGS;
  },

  async getHearing(id: string): Promise<Hearing> {
    try {
      const res = await authFetch(`/api/v1/hearings/${id}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_HEARINGS.find((h) => h.id === id) || MOCK_DEMO_HEARING;
  },

  async getTranscript(hearingId: string, blockIndex?: number): Promise<TranscriptSegment[]> {
    try {
      const url = blockIndex ? `/api/v1/transcriptions/hearing/${hearingId}?blockIndex=${blockIndex}` : `/api/v1/transcriptions/hearing/${hearingId}`;
      const res = await authFetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return blockIndex ? MOCK_SEGMENTS.filter(s => s.blockIndex === blockIndex) : MOCK_SEGMENTS;
  },

  async getBlocks(hearingId: string): Promise<TranscriptBlock[]> {
    try {
      const res = await authFetch(`/api/v1/transcriptions/hearing/${hearingId}/blocks`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return MOCK_BLOCKS;
  },

  async getAta(hearingId: string): Promise<AtaDraft> {
    try {
      const res = await authFetch(`/api/v1/ai/hearings/${hearingId}/ata`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_ATA;
  },

  async generateAta(hearingId: string): Promise<AtaDraft> {
    try {
      const res = await authFetch(`/api/v1/ai/hearings/${hearingId}/generate-ata`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_ATA;
  },

  async getAnalysis(hearingId: string): Promise<HearingSummary> {
    try {
      const res = await authFetch(`/api/v1/ai/hearings/${hearingId}/analysis`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return MOCK_SUMMARY;
  },

  async chatCopilot(
    hearingId: string,
    question: string,
    blockIndices?: number[],
    useFullTranscript?: boolean
  ): Promise<CopilotResponse> {
    const sanitizedBlockIndices = (blockIndices || []).slice(0, 2); // Max 2 blocks
    try {
      const res = await authFetch(`/api/v1/ai/hearings/${hearingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearingId,
          question,
          blockIndices: sanitizedBlockIndices,
          useFullTranscript: Boolean(useFullTranscript),
          conversationHistory: []
        })
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    // Smart realistic fallback answering legal questions based on transcript and selected 256k blocks
    const qLower = question.toLowerCase();
    let blockPrefix = '';
    if (sanitizedBlockIndices.length > 0) {
      blockPrefix = `[Contexto: Bloco(s) ${sanitizedBlockIndices.join(', ')} | ~${sanitizedBlockIndices.length * 256}k tokens] `;
    } else if (useFullTranscript) {
      blockPrefix = `[Contexto: Transcrição Integral | < 512k tokens] `;
    }

    if (qLower.includes('notific') || qLower.includes('março') || qLower.includes('chave')) {
      return {
        answer: `${blockPrefix}De acordo com o depoimento prestado pela Autora (Mariana Ribeiro Silva) às 01:18 (Bloco 2), foram enviadas três notificações extrajudiciais solicitando a devolução das quantias pagas após a paralisação das obras prevista para março de 2023.`,
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
      const res = await authFetch('/api/v1/users/me', { cache: 'no-store' });
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
      const res = await authFetch(`/api/v1/users/${userId}/config`, {
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
      const res = await authFetch('/api/v1/system/config', { cache: 'no-store' });
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
      const res = await authFetch('/api/v1/system/config', {
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
      const res = await authFetch('/api/v1/config/overview', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      prompts: MOCK_PROMPTS,
      models: MOCK_MODELS,
      dashboards: MOCK_DASHBOARDS,
      notifications: MOCK_NOTIFICATION_TYPES,
      settings: MOCK_SETTINGS,
      generatedAt: new Date().toISOString()
    };
  },

  async getPromptTemplates(category?: string): Promise<any[]> {
    try {
      const url = category ? `/api/v1/config/prompts?category=${category}` : '/api/v1/config/prompts';
      const res = await authFetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return category ? MOCK_PROMPTS.filter(p => p.category === category) : MOCK_PROMPTS;
  },

  async updatePromptTemplate(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/config/prompts/${id}`, {
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
      const res = await authFetch('/api/v1/config/prompts/render', {
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
      const res = await authFetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return type ? MOCK_MODELS.filter(m => m.modelType === type) : MOCK_MODELS;
  },

  async setDefaultAiModel(id: string): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/config/models/${id}/set-default`, { method: 'PATCH' });
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
      const res = await authFetch(`/api/v1/config/models/${id}`, {
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
      const res = await authFetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return role ? MOCK_DASHBOARDS.filter(d => d.targetRole === role || d.targetRole === 'ALL') : MOCK_DASHBOARDS;
  },

  async updateDashboardType(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/config/dashboards/${id}`, {
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
      const res = await authFetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return category ? MOCK_NOTIFICATION_TYPES.filter(n => n.category === category) : MOCK_NOTIFICATION_TYPES;
  },

  async updateNotificationType(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/config/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const index = MOCK_NOTIFICATION_TYPES.findIndex(n => n.id === id);
    if (index !== -1) {
      MOCK_NOTIFICATION_TYPES[index] = { ...MOCK_NOTIFICATION_TYPES[index], ...data, updatedAt: new Date().toISOString() };
      return MOCK_NOTIFICATION_TYPES[index];
    }
    return data;
  },

  async getSystemSettings(category?: string): Promise<any[]> {
    try {
      const url = category ? `/api/v1/config/settings?category=${category}` : '/api/v1/config/settings';
      const res = await authFetch(url);
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
      const res = await authFetch(`/api/v1/config/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    MOCK_SETTINGS[key] = data.value;
    return { key, value: data.value, description: data.description };
  },

  async listEnterpriseAgents(): Promise<any[]> {
    try {
      const res = await authFetch('/api/v1/agent-garden/agents');
      if (res.ok) return await res.json();
    } catch (_) {}
    return [
      {
        id: 'agent-juris-01',
        code: 'AGENT_JURISPRUDENCE_SEARCH',
        name: 'Pesquisa Jurisprudencial & Súmulas',
        description: 'Agente especialista em recuperação de julgados, teses de repercussão geral do STF e recursos repetitivos do STJ.',
        category: 'JURISPRUDENCE',
        icon: 'Scale',
        agentType: 'GEMINI_ENTERPRISE_USER_AGENT',
        capabilities: ['Busca Semântica Multitribunal', 'Validação de Súmulas Vinculantes', 'Análise de Distinguishing'],
        dataStores: ['stf_jurisprudencia_store', 'stj_repetitivos_store', 'tjsp_acordaos_store'],
        defaultModel: 'gemini-2.0-flash',
        status: 'ACTIVE',
        isDefault: true
      },
      {
        id: 'agent-contradiction-02',
        code: 'AGENT_CONTRADICTION_AUDITOR',
        name: 'Auditor de Contradições & Depoimentos',
        description: 'Agente que cruza depoimentos colhidos em audiência com peças processuais para apontar divergências fáticas.',
        category: 'CONTRADICTION_AUDIT',
        icon: 'AlertTriangle',
        agentType: 'ADK',
        capabilities: ['Cruzamento de Depoimentos', 'Detecção de Inconsistências', 'Mapeamento Fático'],
        dataStores: ['hearings_transcripts_store', 'case_documents_store'],
        defaultModel: 'gemini-2.0-flash',
        status: 'ACTIVE',
        isDefault: false
      },
      {
        id: 'agent-drafter-03',
        code: 'AGENT_DECISION_DRAFTER',
        name: 'Redator de Decisões & Termos',
        description: 'Agente voltado para elaboração formal de minutas de sentenças, despachos e termos de audiência.',
        category: 'DOCUMENT_GENERATION',
        icon: 'FileText',
        agentType: 'GEMINI_ENTERPRISE_USER_AGENT',
        capabilities: ['Minutas de Atas Judiciais', 'Padronização CNJ', 'Dosimetria e Dispositivo'],
        dataStores: ['judicial_templates_store', 'legal_codes_store'],
        defaultModel: 'gemini-2.0-flash',
        status: 'ACTIVE',
        isDefault: false
      },
      {
        id: 'agent-docket-04',
        code: 'AGENT_DOCKET_MANAGEMENT',
        name: 'Gestor de Pautas & Deliberações',
        description: 'Agente que monitora compromissos assumidos em audiência, prazos peremptórios e intimações.',
        category: 'PROCESS_MANAGEMENT',
        icon: 'Calendar',
        agentType: 'A2A',
        capabilities: ['Extrator de Prazos', 'Gestão de Pautas', 'Notificações aos Advogados'],
        dataStores: ['case_dockets_store'],
        defaultModel: 'gemini-2.0-flash-lite',
        status: 'ACTIVE',
        isDefault: false
      }
    ];
  },

  async getEnterpriseAgent(id: string): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/agent-garden/agents/${id}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    const agents = await this.listEnterpriseAgents();
    return agents.find((a: any) => a.id === id) || agents[0];
  },

  async getAgentSessions(agentId: string): Promise<any[]> {
    try {
      const res = await authFetch(`/api/v1/agent-garden/agents/${agentId}/sessions`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return [
      {
        sessionId: `sess-${agentId}-01`,
        agentId,
        title: 'Consulta sobre precedente vinculante e alcance fático',
        turnCount: 4,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        lastActiveAt: new Date(Date.now() - 1800000).toISOString(),
        queryHistory: ['Qual o alcance do Tema 1.046 do STF?', 'Como aplicar na minuta?']
      },
      {
        sessionId: `sess-${agentId}-02`,
        agentId,
        title: 'Verificação de deliberações e intimações da audiência',
        turnCount: 2,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastActiveAt: new Date(Date.now() - 82800000).toISOString(),
        queryHistory: ['Quais os prazos fixados em ata?']
      }
    ];
  },

  async createAgentSession(agentId: string, title?: string): Promise<any> {
    try {
      const res = await authFetch('/api/v1/agent-garden/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, title })
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      sessionId: `sess-${agentId}-${Date.now().toString(36)}`,
      agentId,
      title: title || 'Nova Sessão Judicial',
      turnCount: 0,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      queryHistory: []
    };
  },

  async chatAgentGarden(queryText: string, sessionId?: string, agentId?: string): Promise<any> {
    try {
      const res = await authFetch('/api/v1/agent-garden/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText, sessionId, agentId })
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      sessionId: sessionId || 'sess-default',
      answer: `Resposta do Agente Gemini Enterprise para: "${queryText}". Análise fundamentada com base nos dados do tribunal.`,
      citations: [
        {
          title: 'STF - Tema 1.046 com Repercussão Geral',
          uri: 'https://portal.stf.jus.br/jurisprudencia/repercussao/tema.asp?num=1046',
          snippet: 'Validade de norma coletiva de trabalho que limita direitos trabalhistas não assegurados constitucionalmente.',
          court: 'STF',
          precedentNumber: 'Tema 1046',
          confidenceScore: 0.96
        }
      ],
      plannerSteps: [
        'Formulando estratégia de busca...',
        'Consultando corpora do Gemini Enterprise...',
        'Sintetizando fundamentação...'
      ]
    };
  },

  // =========================================================================
  // Case Service & Case Documents Management
  // =========================================================================
  async listCases(search?: string, status?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'ALL') params.append('status', status);
      const url = `/api/v1/cases${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await authFetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    return [
      {
        id: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível da Comarca de São Paulo',
        legalBranch: 'CIVIL',
        subject: 'Indenização por Danos Morais e Rescisão Contratual',
        plaintiffName: 'Carlos Eduardo Mendes',
        defendantName: 'Construtora e Incorporadora Metrópole S.A.',
        judgeName: 'Dra. Camila Vasconcelos',
        prosecutorName: 'Dr. Fernando Meirelles',
        status: 'EM_ANDAMENTO',
        documents: [
          {
            id: 'doc-001',
            caseId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
            title: 'Petição Inicial com Pedido Liminar de Urgência',
            documentType: 'PETICAO_INICIAL',
            fileName: 'peticao_inicial_0014238.pdf',
            fileSize: 1420500,
            mimeType: 'application/pdf',
            pageCount: 18,
            ocrStatus: 'COMPLETED',
            uploadedBy: 'Dra. Luciana Ferreira',
            uploadedAt: '2024-03-15T10:00:00Z'
          },
          {
            id: 'doc-002',
            caseId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
            title: 'Contestação com Documentos e Preliminares',
            documentType: 'CONTESTACAO',
            fileName: 'contestacao_metropole_sa.pdf',
            fileSize: 3100200,
            mimeType: 'application/pdf',
            pageCount: 34,
            ocrStatus: 'COMPLETED',
            uploadedBy: 'Dr. Roberto Silva',
            uploadedAt: '2024-04-10T14:30:00Z'
          },
          {
            id: 'doc-003',
            caseId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
            title: 'Laudo Pericial de Engenharia Civil e Segurança da Obra',
            documentType: 'LAUDO_TECNICO',
            fileName: 'laudo_pericial_engenharia.pdf',
            fileSize: 5420100,
            mimeType: 'application/pdf',
            pageCount: 42,
            ocrStatus: 'COMPLETED',
            uploadedBy: 'Perito Eng. Marcelo Rossi',
            uploadedAt: '2024-06-20T09:15:00Z'
          }
        ],
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2026-08-06T14:22:00Z'
      }
    ];
  },

  async getCase(id: string): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/cases/${id}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    const cases = await this.listCases();
    return cases.find((c: any) => c.id === id) || cases[0];
  },

  async getCaseDocuments(caseId: string): Promise<any[]> {
    try {
      const res = await authFetch(`/api/v1/cases/${caseId}/documents`);
      if (res.ok) return await res.json();
    } catch (_) {}
    const c = await this.getCase(caseId);
    return c?.documents || [];
  },

  async addCaseDocument(caseId: string, document: any): Promise<any> {
    try {
      const res = await authFetch(`/api/v1/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      ...document,
      id: `doc-${Date.now().toString(36)}`,
      caseId,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async deleteCaseDocument(caseId: string, documentId: string): Promise<boolean> {
    try {
      const res = await authFetch(`/api/v1/cases/${caseId}/documents/${documentId}`, {
        method: 'DELETE'
      });
      if (res.ok) return true;
    } catch (_) {}
    return true;
  },

  // =========================================================================
  // Unified Elasticsearch Full-Text Search (Indexer Service)
  // =========================================================================
  async searchUnified(query: string, entityType: string = 'ALL', limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (entityType && entityType !== 'ALL') params.append('type', entityType);
      params.append('limit', limit.toString());

      const res = await authFetch(`/api/v1/indexer/search?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch (_) {}

    // Fallback simulation matching query across cases, documents, transcripts
    const cleanQ = query.toLowerCase().trim();
    const mockResults = [
      {
        id: 'case-0014238',
        entityType: 'CASE',
        title: 'Processo 0014238-89.2024.8.26.0100 - Rescisão Contratual e Atraso de Obra',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível da Comarca de São Paulo',
        highlightSnippet: `Ação ordinária de rescisão com restituição de quantias pagas. Autor: Carlos Eduardo Mendes. Réu: Construtora Metrópole S.A.`,
        score: 18.5,
        targetUrl: '/cases/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      },
      {
        id: 'doc-laudo-0014238',
        entityType: 'CASE_DOCUMENT',
        title: 'Laudo Pericial de Engenharia Civil e Cronograma de Obras',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível de São Paulo',
        highlightSnippet: `Perícia técnica de engenharia constatou atraso de 14 meses no cronograma executivo das fundações e estrutura.`,
        score: 14.2,
        targetUrl: '/cases/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      },
      {
        id: 'trans-seg-01',
        entityType: 'HEARING_TRANSCRIPT',
        title: 'Depoimento Autoral - Mariana Ribeiro Silva (00:49)',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível de São Paulo',
        speakerName: 'Mariana Ribeiro Silva',
        highlightSnippet: `Mariana Ribeiro Silva: 'Enviei três notificações extrajudiciais e a ré informou que houve falta de insumos...'`,
        score: 12.0,
        targetUrl: '/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      },
      {
        id: 'agent-juris-01',
        entityType: 'AGENT_KNOWLEDGE',
        title: 'Agente de Pesquisa Jurisprudencial & Súmulas Vinculantes',
        caseNumber: 'N/A',
        courtJurisdiction: 'Tribunais Superiores (STF/STJ)',
        highlightSnippet: `Agente corporativo do Gemini Enterprise conectado ao Discovery Engine StreamAssist.`,
        score: 9.8,
        targetUrl: '/agents/agent-juris-01'
      },
      {
        id: 'chat-notebook-0014238',
        entityType: 'NOTEBOOK_CONVERSATION',
        title: 'Caderno: Análise de Teses sobre Súmula 543 STJ e Rescisão Culposa',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível da Comarca de São Paulo',
        highlightSnippet: `Conversa do Caderno: Juíza consultou aplicabilidade da Súmula 543 do STJ quando comprovada a mora da construtora (atraso de 14 meses).`,
        score: 13.5,
        targetUrl: '/notebooks/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      },
      {
        id: 'chat-hearing-0014238',
        entityType: 'HEARING_CHAT',
        title: 'Chat da Audiência: Pergunta sobre Notificações e Paralisação das Obras',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: '2ª Vara Cível da Comarca de São Paulo',
        highlightSnippet: `Gemini Chat da Audiência: Aos 00:49 a autora Mariana declarou que enviou 3 notificações extrajudiciais comprovando recusa da ré.`,
        score: 11.8,
        targetUrl: '/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      },
      {
        id: 'chat-enterprise-agent-juris',
        entityType: 'AGENT_CONVERSATION',
        title: 'Conversa com Agente: Jurisprudência sobre Rescisão Imobiliária e Lucros Cessantes',
        caseNumber: '0014238-89.2024.8.26.0100',
        courtJurisdiction: 'Tribunais Superiores (STF/STJ)',
        highlightSnippet: `Sessão StreamAssist Gemini Enterprise: Consulta sobre cumulação de lucros cessantes com cláusula penal moratória (Tema 970/STJ).`,
        score: 10.4,
        targetUrl: '/agents/agent-juris-01'
      }
    ];

    const filtered = cleanQ
      ? mockResults.filter((r) =>
          r.title.toLowerCase().includes(cleanQ) ||
          (r.caseNumber && r.caseNumber.toLowerCase().includes(cleanQ)) ||
          r.highlightSnippet.toLowerCase().includes(cleanQ) ||
          (r.speakerName && r.speakerName.toLowerCase().includes(cleanQ))
        )
      : mockResults;

    return {
      query,
      totalHits: filtered.length,
      tookMs: 12,
      results: filtered,
      facets: {
        CASE: filtered.filter(f => f.entityType === 'CASE').length,
        CASE_DOCUMENT: filtered.filter(f => f.entityType === 'CASE_DOCUMENT').length,
        HEARING_TRANSCRIPT: filtered.filter(f => f.entityType === 'HEARING_TRANSCRIPT').length,
        AGENT_KNOWLEDGE: filtered.filter(f => f.entityType === 'AGENT_KNOWLEDGE').length
      }
    };
  },

  async triggerReindex(): Promise<any> {
    try {
      const res = await authFetch('/api/v1/indexer/reindex', { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: 'COMPLETED', message: 'Reindexação concluída no cluster Elasticsearch' };
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

const MOCK_NOTIFICATION_TYPES = [
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
  'gemini.default_model': 'gemini-2.0-flash',
  'gemini.embedding_model': 'text-embedding-004',
  'gemini.temperature': 0.2,
  'security.jwt_expiration_minutes': 60,
  'transcription.max_audio_size_mb': 500,
  'transcription.auto_generate_ata': true,
  'transcription.enable_speaker_diarization': true,
};

const MOCK_NOTIFICATIONS: JudicialNotification[] = [
  {
    id: 'n1111111-1111-1111-1111-111111111111',
    title: 'Transcrição de Audiência Concluída',
    message: 'A gravação da audiência do processo 0014238-19.2024.8.26.0100 foi transcrita e diarizada com sucesso (6 intervenções). A ata já pode ser gerada.',
    category: 'AUDIO_PROCESSING',
    priority: 'NORMAL',
    read: false,
    actionUrl: '/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'n2222222-2222-2222-2222-222222222222',
    title: 'Minuta da Ata de Audiência Pronta',
    message: 'A minuta da ata do processo 0004521-88.2024.8.26.0100 foi gerada pelo modelo Gemini 2.0 Flash e está pronta para revisão.',
    category: 'DOCUMENT_WORKFLOW',
    priority: 'NORMAL',
    read: true,
    actionUrl: '/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

export async function getJudicialNotifications(unreadOnly = false): Promise<JudicialNotification[]> {
  try {
    const res = await fetch(`http://localhost:8087/api/v1/notifications?unreadOnly=${unreadOnly}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // fallback to mock
  }
  return unreadOnly ? MOCK_NOTIFICATIONS.filter(n => !n.read) : MOCK_NOTIFICATIONS;
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await fetch('http://localhost:8087/api/v1/notifications/unread-count', {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return data.unreadCount ?? 0;
    }
  } catch (e) {
    // fallback
  }
  return MOCK_NOTIFICATIONS.filter(n => !n.read).length;
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:8087/api/v1/notifications/${id}/read`, {
      method: 'PUT'
    });
    return res.ok;
  } catch (e) {
    const n = MOCK_NOTIFICATIONS.find(item => item.id === id);
    if (n) n.read = true;
    return true;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8087/api/v1/notifications/read-all', {
      method: 'PUT'
    });
    return res.ok;
  } catch (e) {
    MOCK_NOTIFICATIONS.forEach(n => { n.read = true; });
    return true;
  }
}

const MOCK_NOTEBOOKS: Notebook[] = [
  {
    id: 'a1111111-2222-3333-4444-555555555555',
    title: 'Caderno de Análise: Rescisão Contratual Imobiliária',
    description: 'Pesquisa comparativa entre a instrução probatória em vídeo e as teses de retenção de 20% vs 100% de restituição.',
    caseNumber: '0014238-19.2024.8.26.0100',
    emoji: '⚖️',
    color: '#e63946',
    totalActiveTokens: 512500,
    sources: [
      {
        id: 's1111111-1111-1111-1111-111111111111',
        notebookId: 'a1111111-2222-3333-4444-555555555555',
        sourceType: 'VIDEO_BLOCK',
        title: 'Bloco 1: Abertura e Tentativa de Conciliação',
        referenceId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
        blockIndex: 1,
        estimatedTokens: 252000,
        isActiveForChat: true,
        content: '[00:00 - 00:18] MAGISTRADO: Declaro aberta a audiência... [00:19 - 00:31] ADVOGADO_AUTOR: Tentamos contato prévio... [00:31 - 00:48] ADVOGADO_REU: Mantemos proposta de retenção contratual de 20%...',
        createdAt: new Date().toISOString()
      },
      {
        id: 's2222222-2222-2222-2222-222222222222',
        notebookId: 'a1111111-2222-3333-4444-555555555555',
        sourceType: 'VIDEO_BLOCK',
        title: 'Bloco 2: Saneamento e Depoimento da Autora',
        referenceId: 'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
        blockIndex: 2,
        estimatedTokens: 256000,
        isActiveForChat: true,
        content: '[00:49 - 01:18] MAGISTRADO: Fixo como ponto controvertido a culpa pela rescisão... [01:18 - 01:55] AUTOR (Mariana Ribeiro): Enviei três notificações extrajudiciais após expirar o prazo de 180 dias...',
        createdAt: new Date().toISOString()
      },
      {
        id: 's3333333-3333-3333-3333-333333333333',
        notebookId: 'a1111111-2222-3333-4444-555555555555',
        sourceType: 'JURISPRUDENCE',
        title: 'STJ - Súmula 543 e Tema Repetitivo 1095',
        referenceId: 'STJ-S543',
        estimatedTokens: 4500,
        isActiveForChat: true,
        content: 'Súmula 543/STJ: Na hipótese de resolução de contrato de promessa de compra e venda de imóvel submetido ao CDC, deve ocorrer a imediata restituição das parcelas pagas pelo promitente comprador - integralmente, em caso de culpa exclusiva do promitente vendedor/construtor.',
        createdAt: new Date().toISOString()
      }
    ],
    notes: [
      {
        id: 'n1111111-2222-3333-4444-555555555555',
        notebookId: 'a1111111-2222-3333-4444-555555555555',
        title: 'Ponto Central: Culpa Exclusiva da Ré pelo Atraso',
        content: 'A prova oral e a notificação de março/2023 corroboram a mora injustificada da construtora ré. Aplicação direta da Súmula 543 do STJ determinando restituição integral de 100%.',
        noteType: 'FINDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function listNotebooks(): Promise<Notebook[]> {
  try {
    const res = await authFetch('/api/v1/notebooks', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  return MOCK_NOTEBOOKS;
}

export async function getNotebook(id: string): Promise<Notebook | null> {
  try {
    const res = await authFetch(`/api/v1/notebooks/${id}`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) {}
  return MOCK_NOTEBOOKS.find((n) => n.id === id) || MOCK_NOTEBOOKS[0];
}

export async function createNotebook(data: {
  title: string;
  description?: string;
  caseNumber?: string;
  emoji?: string;
  color?: string;
}): Promise<Notebook> {
  try {
    const res = await authFetch('/api/v1/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  const created: Notebook = {
    id: `nb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: data.title,
    description: data.description || '',
    caseNumber: data.caseNumber,
    emoji: data.emoji || '📓',
    color: data.color || '#e63946',
    sources: [],
    notes: [],
    totalActiveTokens: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const filtered = MOCK_NOTEBOOKS.filter(n => n.id !== created.id);
  MOCK_NOTEBOOKS.length = 0;
  MOCK_NOTEBOOKS.push(created, ...filtered);
  return created;
}

export async function toggleNotebookSource(
  notebookId: string,
  sourceId: string,
  active: boolean
): Promise<boolean> {
  try {
    const res = await authFetch(
      `/api/v1/notebooks/${notebookId}/sources/${sourceId}/toggle`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      }
    );
    if (res.ok) return true;
  } catch (e) {}
  const nb = MOCK_NOTEBOOKS.find((n) => n.id === notebookId);
  const src = nb?.sources.find((s) => s.id === sourceId);
  if (src) src.isActiveForChat = active;
  return true;
}

export async function addNotebookSource(
  notebookId: string,
  source: Partial<NotebookSource>
): Promise<NotebookSource> {
  try {
    const res = await authFetch(`/api/v1/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source)
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  const s: NotebookSource = {
    id: `src-${Date.now()}`,
    notebookId,
    sourceType: source.sourceType || 'CUSTOM_TEXT',
    title: source.title || 'Nova Fonte',
    referenceId: source.referenceId,
    blockIndex: source.blockIndex,
    content: source.content || '',
    estimatedTokens: source.estimatedTokens || 5000,
    isActiveForChat: source.isActiveForChat !== false,
    createdAt: new Date().toISOString()
  };
  const nb = MOCK_NOTEBOOKS.find((n) => n.id === notebookId);
  if (nb) nb.sources.push(s);
  return s;
}

export async function deleteNotebookSource(
  notebookId: string,
  sourceId: string
): Promise<boolean> {
  try {
    const res = await authFetch(
      `/api/v1/notebooks/${notebookId}/sources/${sourceId}`,
      { method: 'DELETE' }
    );
    if (res.ok) return true;
  } catch (e) {}
  const nb = MOCK_NOTEBOOKS.find((n) => n.id === notebookId);
  if (nb) nb.sources = nb.sources.filter((s) => s.id !== sourceId);
  return true;
}

export async function chatNotebook(
  notebookId: string,
  question: string,
  activeSourceIds?: string[]
): Promise<any> {
  try {
    const res = await authFetch(`/api/v1/notebooks/${notebookId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, activeSourceIds })
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  return {
    messageId: `msg-${Date.now()}`,
    answer:
      'Com base no exame das fontes ativas do caderno:\n\n1. **Frustração da Conciliação (Bloco 1)**: Durante a audiência de instrução, a ré ofertou restituição de 80% dos valores pagos com retenção de 20%, o que foi recusado pela autora.\n2. **Adequação Jurisprudencial (Súmula 543/STJ)**: Como a prova oral aponta culpa exclusiva da construtora pelo atraso na obra após 180 dias de tolerância, a retenção de 20% pretendida é indevida, incidindo o dever de devolução de 100% integral e imediata.',
    activeSourceTitles: [
      'Bloco 1: Abertura e Tentativa de Conciliação',
      'Bloco 2: Saneamento e Depoimento da Autora',
      'STJ - Súmula 543 e Tema Repetitivo 1095'
    ],
    citations: [
      {
        sourceTitle: 'STJ - Súmula 543',
        snippet: 'Na hipótese de resolução de contrato de promessa de compra e venda de imóvel...',
        referenceUrl: '/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98'
      }
    ],
    estimatedTokensUsed: 512500
  };
}

export async function createNotebookNote(
  notebookId: string,
  data: { title: string; content: string; noteType?: string }
): Promise<NotebookNote> {
  try {
    const res = await authFetch(`/api/v1/notebooks/${notebookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  const note: NotebookNote = {
    id: `note-${Date.now()}`,
    notebookId,
    title: data.title,
    content: data.content,
    noteType: (data.noteType as any) || 'NOTE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const nb = MOCK_NOTEBOOKS.find((n) => n.id === notebookId);
  if (nb) nb.notes.unshift(note);
  return note;
}

