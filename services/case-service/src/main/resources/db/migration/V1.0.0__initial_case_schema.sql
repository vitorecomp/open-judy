-- =========================================================================
-- Open Judy :: case-service Initial Database Schema & Seed Data
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tb_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(64) NOT NULL UNIQUE,
    court_jurisdiction VARCHAR(255) NOT NULL,
    legal_branch VARCHAR(64) NOT NULL DEFAULT 'CIVIL',
    subject VARCHAR(500),
    plaintiff_name VARCHAR(255),
    defendant_name VARCHAR(255),
    judge_name VARCHAR(255),
    prosecutor_name VARCHAR(255),
    status VARCHAR(64) NOT NULL DEFAULT 'EM_ANDAMENTO',
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_case_number ON tb_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_legal_branch ON tb_cases(legal_branch);
CREATE INDEX IF NOT EXISTS idx_cases_status ON tb_cases(status);

CREATE TABLE IF NOT EXISTS tb_case_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES tb_cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(64) NOT NULL DEFAULT 'OUTROS',
    file_name VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(128) DEFAULT 'application/pdf',
    storage_uri VARCHAR(512),
    page_count INT DEFAULT 1,
    ocr_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    extracted_text TEXT,
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON tb_case_documents(case_id);

INSERT INTO tb_cases (id, case_number, court_jurisdiction, legal_branch, subject, plaintiff_name, defendant_name, judge_name, status)
VALUES
    ('c1000000-0000-0000-0000-000000000001', '0014238-19.2024.8.26.0100', '3ª Vara Cível Central - Comarca de São Paulo/SP', 'CIVIL', 'Rescisão Contratual c/c Indenização por Danos Morais e Materiais - Atraso de Obra Imobiliária', 'Mariana Ribeiro Fontes', 'Construtora Horizonte Sul S.A.', 'Dra. Camila Vasconcelos de Albuquerque', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000002', '1008942-55.2024.8.26.0100', '3ª Vara Cível Central - Comarca de São Paulo/SP', 'CIVIL', 'Obrigação de Fazer c/c Tutela de Urgência - Cobertura de Tratamento Oncológico', 'Roberto Carlos Mendes', 'Operadora Vida Plena Saúde S.A.', 'Dra. Camila Vasconcelos de Albuquerque', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000003', '1502391-88.2023.8.26.0050', '12ª Vara Criminal - Foro Central Criminal Barra Funda/SP', 'CRIMINAL', 'Estelionato Digital e Fraude Bancária Estruturada (Art. 171, § 2º-A, CP)', 'Ministério Público do Estado de São Paulo', 'Eduardo Henrique Mota', 'Dr. Fernando Augusto Silveira', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000004', '0003912-40.2024.5.02.0014', '14ª Vara do Trabalho de São Paulo - TRT-2', 'TRABALHISTA', 'Reconhecimento de Vínculo Empregatício, Horas Extras e Assédio Moral Organizacional', 'Juliana Martins Costa', 'Logística Expressa Brasil Ltda.', 'Dra. Helena Borges Prado', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000005', '0804119-72.2024.8.26.0100', '1ª Vara Empresarial e de Conflitos de Arbitragem - TJSP', 'EMPRESARIAL', 'Dissolução Parcial de Sociedade Anônima Fechada e Apuração de Haveres', 'Fundo Vanguarda Participações S.A.', 'TechNova Soluções Industriais Ltda.', 'Dr. Ricardo Paiva Neto', 'EM_ANDAMENTO')
ON CONFLICT DO NOTHING;

INSERT INTO tb_case_documents (id, case_id, title, document_type, file_name, file_size, mime_type, storage_uri, page_count, ocr_status, extracted_text, uploaded_by)
VALUES
    ('cd000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Petição Inicial e Instrumento Particular de Promessa de Compra e Venda', 'PETICAO_INICIAL', 'peticao_inicial_0014238.pdf', 2458120, 'application/pdf', 's3://judy-cases-bucket/cases/0014238-19.2024.8.26.0100/peticao_inicial.pdf', 24, 'COMPLETED', 'Cláusula 8.1: O prazo de entrega das chaves do empreendimento Residencial Parque das Águas é 30 de setembro de 2022, admitida tolerância máxima improrrogável de 180 (cento e oitenta) dias corridos, encerrando-se em 30 de março de 2023. Pedido: Rescisão contratual por culpa exclusiva da promitente vendedora com restituição integral (100%) dos valores pagos (Súmula 543/STJ) e lucros cessantes.', 'Dr. Lucas Menezes Braga (OAB/SP 389.122)'),
    ('cd000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Contestação da Construtora Horizonte Sul S.A.', 'CONTESTACAO', 'contestacao_horizonte_sul.pdf', 1842900, 'application/pdf', 's3://judy-cases-bucket/cases/0014238-19.2024.8.26.0100/contestacao.pdf', 18, 'COMPLETED', 'Sustenta fortuito externo decorrente de escassez de insumos na construção civil e demora burocrática municipal na expedição do Habite-se. Requer, subsidiariamente, a retenção de 20% a 25% dos valores pagos a título de despesas administrativas.', 'Dra. Patrícia Nogueira Lima (OAB/SP 274.910)'),
    ('cd000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Notificações Extrajudiciais e Comprovantes de Locação', 'PROVA_DOCUMENTAL', 'notificacoes_e_recibos_aluguel.pdf', 984120, 'application/pdf', 's3://judy-cases-bucket/cases/0014238-19.2024.8.26.0100/notificacoes.pdf', 9, 'COMPLETED', 'Notificações extrajudiciais enviadas em 10/04/2023, 15/07/2023 e 20/10/2023 constituindo a construtora em mora. Recibos mensais de locação residencial no valor de R$ 3.800,00.', 'Dr. Lucas Menezes Braga (OAB/SP 389.122)')
ON CONFLICT DO NOTHING;
