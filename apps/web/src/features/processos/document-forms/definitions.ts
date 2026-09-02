export type DocumentFormFieldType =
  | "text"
  | "textarea"
  | "date"
  | "email"
  | "tel"
  | "number"
  | "password"
  | "select"
  | "checkbox";

export interface DocumentFormOption {
  value: string;
  label: string;
  tag?: string;
}

export interface DocumentFormField {
  name: string;
  label: string;
  type?: DocumentFormFieldType;
  placeholder?: string;
  options?: DocumentFormOption[];
  wide?: boolean;
  help?: string;
}

export interface DocumentFormSection {
  title: string;
  description?: string;
  fields: DocumentFormField[];
}

export interface AreaDocumentTemplate {
  id: string;
  title: string;
  description: string;
  sourceHref: string;
  templateHref: string;
  downloadName: string;
  sections: DocumentFormSection[];
}

const text = (
  name: string,
  label: string,
  options: Omit<DocumentFormField, "name" | "label"> = {},
): DocumentFormField => ({ name, label, ...options });

const checkbox = (name: string, label: string): DocumentFormField => ({
  name,
  label,
  type: "checkbox",
  wide: true,
});

const yesNo = (
  name: string,
  label: string,
  yesTag: string,
  noTag: string,
): DocumentFormField => ({
  name,
  label,
  type: "select",
  options: [
    { value: "", label: "Não informado" },
    { value: "yes", label: "Sim", tag: yesTag },
    { value: "no", label: "Não", tag: noTag },
  ],
});

const clientFields: DocumentFormField[] = [
  text("client_name", "Nome completo"),
  text("cpf", "CPF"),
  text("nationality", "Nacionalidade"),
  text("marital_status", "Estado civil"),
  text("profession", "Profissão"),
  text("birth_date", "Data de nascimento", { type: "date" }),
  text("age", "Idade", { type: "number" }),
  text("parentage", "Filiação", { wide: true }),
  text("identity_number", "RG / identidade"),
  text("identity_issuer", "Órgão expedidor"),
  text("identity_issue_date", "Data de expedição", { type: "date" }),
  text("address", "Endereço completo", { wide: true }),
  text("cep", "CEP"),
  text("phone", "Telefone", { type: "tel" }),
  text("email", "E-mail", { type: "email" }),
];

const laborQuestions = [
  "Qual a data de admissão?",
  "Qual a data do desligamento (se houver)?",
  "Qual era a função registrada na CTPS?",
  "Quais atividades efetivamente exercia? Houve acúmulo ou desvio de função?",
  "Trabalhou em algum período sem registro na CTPS? Em caso positivo, informe as datas.",
  "Houve alteração de função, salário ou local de trabalho durante o contrato?",
  "Qual era o salário inicial?",
  "Qual foi o último salário recebido?",
  "Recebia comissões, gratificações, prêmios, bônus, gorjetas ou participação nos lucros? Especifique.",
  "Recebia algum valor por fora do contracheque? Informe os valores aproximados e a forma de pagamento.",
  "Havia atrasos no pagamento dos salários ou de outras verbas?",
  "Recebia corretamente o 13º salário?",
  "As férias eram concedidas regularmente? Recebia o pagamento acrescido de 1/3 constitucional?",
  "Qual era o horário contratual de trabalho?",
  "Qual era a jornada efetivamente cumprida (horário de entrada, saída e dias trabalhados)?",
  "Trabalhava aos sábados, domingos ou feriados? Com que frequência?",
  "Realizava horas extras? Em média, quantas por dia ou semana? Eram pagas ou compensadas?",
  "Prestava trabalho em horário noturno? Em quais horários? Recebia adicional noturno?",
  "Qual era o intervalo intrajornada efetivamente usufruído para refeição e descanso?",
  "Havia intervalo entre jornadas inferior a 11 horas?",
  "Permanecia à disposição da empresa fora do expediente (telefone, aplicativos, plantões ou sobreaviso)?",
  "Como era realizado o controle de ponto (manual, mecânico, eletrônico ou aplicativo)?",
  "Registrava corretamente os horários efetivamente trabalhados?",
  "Havia orientação para registrar horário diferente do efetivamente cumprido?",
  "Exercia atividades insalubres ou perigosas? Descreva os agentes ou condições de risco.",
  "Recebia Equipamentos de Proteção Individual (EPIs)? Quais?",
  "Os EPIs eram adequados e substituídos regularmente?",
  "Recebeu treinamento sobre saúde e segurança do trabalho?",
  "Foi informado sobre os riscos inerentes às atividades exercidas?",
  "Sofreu acidente de trabalho ou desenvolveu doença relacionada ao trabalho?",
  "Houve emissão da Comunicação de Acidente de Trabalho (CAT)? Possui cópia?",
  "Ficou afastado pelo INSS? Informe os períodos e a espécie do benefício recebido.",
  "Possui laudos médicos, exames, receitas, prontuários ou outros documentos relacionados à enfermidade ou ao acidente?",
  "Caso não possua CAT, dispõe de provas de que a doença ou lesão decorreu das atividades laborais?",
  "Recebia benefícios como vale-transporte, vale-alimentação, plano de saúde, auxílio-creche ou outros?",
  "A empresa efetuava corretamente os recolhimentos do FGTS? Possui extrato analítico do FGTS?",
  "A empresa recolhia regularmente as contribuições previdenciárias? Possui extrato CNIS?",
  "Recebia salário-família? Possuía filho menor de 14 anos ou equiparado durante o vínculo?",
  "O desligamento ocorreu por pedido de demissão, dispensa sem justa causa, justa causa, rescisão indireta ou acordo?",
  "Recebeu aviso-prévio? Foi trabalhado ou indenizado?",
  "Recebeu corretamente as verbas rescisórias? Em que data ocorreu o pagamento?",
  "Assinou termo de rescisão, acordo ou quitação? Recebeu cópia dos documentos?",
  "Houve homologação da rescisão? Onde ocorreu?",
  "Sofreu ou presenciou assédio moral, assédio sexual, discriminação ou tratamento humilhante? Descreva os fatos.",
  "Comunicou formalmente à empresa alguma irregularidade ou apresentou reclamações internas?",
  "Sofreu retaliação após apresentar reclamações ou exercer algum direito?",
  "Possui testemunhas que possam confirmar os fatos narrados? Informe nomes e contatos.",
  "Possui documentos, mensagens, e-mails, fotografias, gravações, conversas por aplicativos ou outros meios de prova?",
  "Possui cópia da CTPS, contracheques, contrato de trabalho, acordos, advertências ou suspensões?",
  "Existe alguma outra irregularidade ou fato relevante que considere importante relatar?",
  "Qual é o principal objetivo da ação trabalhista?",
  "Já ajuizou ação trabalhista anterior contra este ou outro empregador?",
];

const laborForm: AreaDocumentTemplate = {
  id: "labor-attendance",
  title: "Ficha de atendimento trabalhista",
  description: "Preencha a entrevista inicial e baixe a ficha completa em Word.",
  sourceHref: "/formularios/trabalhista-ficha-atendimento.docx",
  templateHref: "/formularios/preenchiveis/trabalhista-ficha-atendimento.docx",
  downloadName: "Ficha de atendimento preenchida - Trabalhista.docx",
  sections: [
    {
      title: "Atendimento",
      fields: [
        text("attendance_date", "Data do primeiro atendimento", { type: "date" }),
        text("responsible_name", "Responsável pelo atendimento"),
        text("file_folder", "Pasta do arquivo"),
        text("contract_date", "Data do contrato", { type: "date" }),
        checkbox("priority", "Prioridade na tramitação"),
        checkbox("urgent_relief", "Tutela de urgência"),
        checkbox("legal_aid", "Gratuidade de justiça"),
      ],
    },
    {
      title: "Cliente",
      fields: [
        ...clientFields,
        text("ctps", "CTPS"),
        text("pis", "PIS"),
        text("client_gender", "Gênero"),
        text("client_race", "Raça / cor"),
      ],
    },
    {
      title: "Representante legal (se houver)",
      fields: [
        text("representative_name", "Nome completo"),
        text("representative_cpf", "CPF"),
        text("representative_nationality", "Nacionalidade"),
        text("representative_marital_status", "Estado civil"),
        text("representative_profession", "Profissão"),
        text("representative_birth_date", "Data de nascimento", { type: "date" }),
        text("representative_age", "Idade", { type: "number" }),
        text("representative_parentage", "Filiação", { wide: true }),
        text("representative_identity_number", "RG / identidade"),
        text("representative_identity_issuer", "Órgão expedidor"),
        text("representative_identity_issue_date", "Data de expedição", { type: "date" }),
        text("representative_ctps", "CTPS"),
        text("representative_pis", "PIS"),
        text("representative_address", "Endereço completo", { wide: true }),
        text("representative_cep", "CEP"),
        text("representative_email", "E-mail", { type: "email" }),
        text("representative_gender", "Gênero"),
        text("representative_race", "Raça / cor"),
      ],
    },
    {
      title: "Contato e renda",
      fields: [
        text("phone_2", "Telefone 2", { type: "tel" }),
        text("whatsapp", "WhatsApp", { type: "tel" }),
        text("other_contact", "Outro contato"),
        text("contact_notes", "Observações de contato", { type: "textarea", wide: true }),
        text("income_source", "Fonte de renda"),
        text("income_amount", "Renda"),
        yesNo("declares_irpf", "Declara IRPF?", "irpf_yes", "irpf_no"),
        yesNo("has_other_income", "Possui outras fontes?", "other_income_yes", "other_income_no"),
        text("income_notes", "Outras informações sobre renda", { type: "textarea", wide: true }),
      ],
    },
    {
      title: "Dados processuais e parte adversária",
      fields: [
        text("legal_area", "Área jurídica"),
        text("territorial_jurisdiction", "Competência territorial"),
        text("limitation_period", "Prescrição"),
        text("initial_term", "Termo inicial"),
        text("final_term", "Termo final"),
        text("filing_date", "Data do ajuizamento", { type: "date" }),
        text("opposing_party", "Nome da parte adversária"),
        text("opposing_tax_id", "CPF / CNPJ da parte adversária"),
        text("opposing_address", "Endereço da parte adversária", { wide: true }),
        text("opposing_city_state_zip", "Cidade / UF / CEP", { wide: true }),
        text("opposing_phone", "Telefone da parte adversária", { type: "tel" }),
        text("opposing_email", "E-mail da parte adversária", { type: "email" }),
        text("opposing_notes", "Outras informações", { type: "textarea", wide: true }),
        text("facts_summary", "Breve síntese dos fatos", { type: "textarea", wide: true }),
      ],
    },
    {
      title: "Questionário trabalhista",
      description: "As 52 perguntas do modelo original.",
      fields: laborQuestions.map((label, index) =>
        text(`q${String(index + 1).padStart(2, "0")}`, `${index + 1}. ${label}`, {
          type: "textarea",
          wide: true,
        }),
      ),
    },
    {
      title: "Estudo e histórico",
      fields: [
        text("case_study", "Estudo do caso", { type: "textarea", wide: true }),
        ...Array.from({ length: 6 }, (_, index) => {
          const number = index + 1;
          return [
            text(`history_${number}_date`, `Histórico ${number}: data`, { type: "date" }),
            text(`history_${number}_type`, `Histórico ${number}: tipo`),
            text(`history_${number}_responsible`, `Histórico ${number}: responsável`),
            text(`history_${number}_description`, `Histórico ${number}: descrição`, { wide: true }),
          ];
        }).flat(),
      ],
    },
  ],
};

const laborDocuments: AreaDocumentTemplate = {
  id: "labor-documents",
  title: "Lista de documentos trabalhistas",
  description: "Identifique o processo e informe até três testemunhas.",
  sourceHref: "/formularios/trabalhista-lista-documentos.docx",
  templateHref: "/formularios/preenchiveis/trabalhista-lista-documentos.docx",
  downloadName: "Lista de documentos preenchida - Trabalhista.docx",
  sections: [
    {
      title: "Identificação",
      fields: [
        text("client_name", "Cliente"),
        text("process_number", "Número do processo"),
        text("attendance_date", "Data", { type: "date" }),
      ],
    },
    ...Array.from({ length: 3 }, (_, index) => {
      const number = index + 1;
      return {
        title: `Testemunha ${number}`,
        fields: [
          text(`witness_${number}_name`, "Nome completo"),
          text(`witness_${number}_cpf`, "CPF"),
          text(`witness_${number}_address`, "Endereço", { wide: true }),
          text(`witness_${number}_whatsapp`, "WhatsApp", { type: "tel" }),
          text(`witness_${number}_phone`, "Telefone", { type: "tel" }),
        ],
      };
    }),
  ],
};

const civilForm: AreaDocumentTemplate = {
  id: "civil-attendance",
  title: "Formulário de atendimento cível",
  description: "Preencha a triagem e avaliação inicial e baixe em Word.",
  sourceHref: "/formularios/civel-formulario-atendimento.docx",
  templateHref: "/formularios/preenchiveis/civel-formulario-atendimento.docx",
  downloadName: "Formulario de atendimento preenchido - Area civel.docx",
  sections: [
    {
      title: "Atendimento e cliente",
      fields: [
        text("responsible_name", "Responsável pelo atendimento"),
        text("attendance_date", "Data do atendimento", { type: "date" }),
        text("case_type", "Tipo de ação"),
        ...clientFields,
      ],
    },
    {
      title: "Dados do atendimento",
      fields: [
        {
          name: "client_role",
          label: "Posição do cliente",
          type: "select",
          options: [
            { value: "", label: "Não informado" },
            { value: "author", label: "Autor", tag: "role_author" },
            { value: "defendant", label: "Réu", tag: "role_defendant" },
            { value: "third", label: "Terceiro interessado", tag: "role_third_party" },
          ],
        },
        checkbox("demand_contracts", "Contratos"),
        checkbox("demand_family", "Família e sucessões"),
        checkbox("demand_consumer", "Consumidor"),
        checkbox("demand_real_estate", "Imobiliário"),
        checkbox("demand_civil_liability", "Responsabilidade civil"),
        checkbox("demand_collection", "Cobrança / execução"),
        checkbox("demand_employer_labor", "Direito do trabalho — empregador"),
        text("demand_other", "Outro tipo de demanda"),
        text("facts", "Descrição detalhada dos fatos", { type: "textarea", wide: true }),
      ],
    },
    {
      title: "Documentos apresentados",
      fields: [
        checkbox("doc_rg_cpf", "RG / CPF"),
        checkbox("doc_address", "Comprovante de endereço"),
        checkbox("doc_contracts", "Contrato(s)"),
        checkbox("doc_messages", "Notificações, e-mails ou mensagens"),
        checkbox("doc_payments", "Comprovantes de pagamento / extratos"),
        checkbox("doc_power_attorney", "Procuração"),
        checkbox("doc_certificates", "Certidões"),
        text("doc_other", "Outros documentos"),
      ],
    },
    {
      title: "Elementos do caso",
      fields: [
        yesNo("has_economic_value", "Há valor econômico?", "economic_value_yes", "economic_value_no"),
        text("economic_value", "Valor econômico"),
        text("opposing_party", "Outra parte"),
        text("relationship", "Relação com o cliente"),
        yesNo("has_deadline", "Há prazo em curso?", "deadline_yes", "deadline_no"),
        text("deadline_details", "Qual prazo?"),
        yesNo("needs_urgent_relief", "É necessária medida urgente?", "urgent_yes", "urgent_no"),
        text("urgent_reason", "Motivo da urgência", { wide: true }),
      ],
    },
    {
      title: "Situação processual",
      fields: [
        yesNo("has_ongoing_case", "Há processo em andamento?", "ongoing_case_yes", "ongoing_case_no"),
        text("process_number", "Número do processo"),
        text("court", "Vara / comarca"),
        text("procedural_stage", "Fase processual"),
        yesNo("has_recent_decision", "Houve decisão recente?", "recent_decision_yes", "recent_decision_no"),
        text("recent_decision_details", "Detalhes da decisão", { type: "textarea", wide: true }),
      ],
    },
    {
      title: "Objetivo do cliente",
      fields: [
        checkbox("objective_file_action", "Propor ação judicial"),
        checkbox("objective_defense", "Apresentar defesa"),
        checkbox("objective_settlement", "Negociar acordo"),
        checkbox("objective_document_review", "Realizar análise documental"),
        checkbox("objective_preventive", "Consultoria preventiva"),
        checkbox("objective_enforcement", "Cumprimento de sentença"),
        checkbox("objective_appeal", "Interpor recurso"),
        text("objective_other", "Outro objetivo"),
      ],
    },
    {
      title: "Avaliação interna e honorários",
      fields: [
        text("legal_possibilities", "Possibilidades jurídicas", { type: "textarea", wide: true }),
        text("identified_risks", "Riscos identificados", { type: "textarea", wide: true }),
        text("suggested_strategy", "Estratégia sugerida", { type: "textarea", wide: true }),
        {
          name: "viability",
          label: "Viabilidade",
          type: "select",
          options: [
            { value: "", label: "Não informada" },
            { value: "high", label: "Alta", tag: "viability_high" },
            { value: "medium", label: "Média", tag: "viability_medium" },
            { value: "low", label: "Baixa", tag: "viability_low" },
          ],
        },
        text("required_diligence", "Diligências necessárias", { type: "textarea", wide: true }),
        text("fees_amount", "Valor dos honorários"),
        text("payment_terms", "Forma e condições de pagamento", { wide: true }),
        yesNo("contract_signed", "Contrato assinado?", "contract_signed_yes", "contract_signed_no"),
        yesNo("power_attorney_issued", "Procuração emitida?", "power_attorney_yes", "power_attorney_no"),
        text("client_signature", "Nome do cliente para assinatura"),
        text("lawyer_signature", "Nome do advogado para assinatura"),
      ],
    },
  ],
};

const civilChecklistGroups: Array<[string, Array<[string, string]>]> = [
  ["Documentos gerais", [
    ["check_rg_cpf", "RG e CPF"], ["check_address", "Comprovante de residência atualizado"],
    ["check_power_attorney", "Procuração assinada"], ["check_low_income", "Declaração de hipossuficiência"],
    ["check_opposing_identity", "Identificação da parte contrária"], ["check_other_evidence", "Outras provas dos fatos"],
  ]],
  ["Ação de cobrança", [
    ["check_collection_contract", "Contrato"], ["check_notes_titles", "Notas promissórias, cheques ou títulos"],
    ["check_overdue_bills", "Boletos vencidos"], ["check_debt_spreadsheet", "Planilha atualizada do débito"],
    ["check_default_proof", "Comprovantes de inadimplência"], ["check_collection_notice", "Notificações extrajudiciais"],
  ]],
  ["Indenização por danos", [
    ["check_police_report", "Boletim de ocorrência"], ["check_photos_videos", "Fotografias e vídeos"],
    ["check_messages", "Conversas, e-mails ou mensagens"], ["check_expenses", "Comprovantes de despesas"],
    ["check_reports", "Laudos médicos ou técnicos"], ["check_damage_proof", "Documentos que demonstrem o dano"],
  ]],
  ["Rescisão contratual", [
    ["check_contract_addenda", "Contrato e aditivos"], ["check_payment_proof", "Comprovantes de pagamento"],
    ["check_sent_received_notices", "Notificações enviadas e recebidas"], ["check_correspondence", "Correspondências entre as partes"],
    ["check_breach_proof", "Provas do descumprimento contratual"],
  ]],
  ["Obrigação de fazer / não fazer", [
    ["check_obligation_document", "Documento que gere a obrigação"], ["check_service_protocols", "Protocolos de atendimento"],
    ["check_admin_complaints", "Reclamações administrativas"], ["check_obligation_notice", "Notificações extrajudiciais"],
    ["check_noncompliance_proof", "Provas do descumprimento"],
  ]],
  ["Usucapião", [
    ["check_possessors_identity", "Documentos pessoais dos possuidores"], ["check_marriage_certificate", "Certidão de casamento"],
    ["check_survey_plan", "Planta e memorial descritivo"], ["check_property_certificate", "Certidão atualizada do imóvel"],
    ["check_possession_proof", "Comprovantes de posse"], ["check_utility_bills", "Contas de consumo"],
    ["check_property_tax", "IPTU / ITR"], ["check_property_photos", "Fotografias do imóvel"],
    ["check_neighbors", "Qualificação dos confrontantes"],
  ]],
  ["Despejo", [
    ["check_lease", "Contrato de locação"], ["check_lease_addenda", "Aditivos contratuais"],
    ["check_lease_default_proof", "Comprovantes de inadimplência"], ["check_lease_debt", "Planilha de débito"],
    ["check_lease_notice", "Notificações extrajudiciais"], ["check_property_documents", "Documentos do imóvel"],
  ]],
];

const civilChecklist: AreaDocumentTemplate = {
  id: "civil-documents",
  title: "Checklist de documentos cíveis",
  description: "Marque o que foi solicitado ou recebido e baixe o checklist pronto.",
  sourceHref: "/formularios/civel-lista-documentos.docx",
  templateHref: "/formularios/preenchiveis/civel-lista-documentos.docx",
  downloadName: "Checklist de documentos preenchido - Area civel.docx",
  sections: [
    {
      title: "Identificação",
      fields: [
        text("client_name", "Cliente"),
        text("cpf", "CPF"),
      ],
    },
    ...civilChecklistGroups.map(([title, items]) => ({
      title,
      fields: items.map(([name, label]) => checkbox(name, label)),
    })),
    {
      title: "Fechamento",
      fields: [
        text("location_date", "Local e data"),
        text("client_signature", "Assinatura do cliente"),
        text("applicant_signature", "Assinatura do requerente"),
      ],
    },
  ],
};

const socialSecurityForm: AreaDocumentTemplate = {
  id: "social-security-attendance",
  title: "Formulário de atendimento previdenciário",
  description: "Preencha a triagem previdenciária e baixe o formulário pronto em Word.",
  sourceHref: "/formularios/previdenciario-federal-formulario-atendimento.docx",
  templateHref: "/formularios/preenchiveis/previdenciario-federal-formulario-atendimento.docx",
  downloadName: "Formulario de atendimento preenchido - Previdenciario e Federal.docx",
  sections: [
    {
      title: "Atendimento e cliente",
      fields: [
        text("responsible_name", "Responsável pelo atendimento"),
        text("attendance_date", "Data do atendimento", { type: "date" }),
        text("service_type", "Espécie de serviço"),
        ...clientFields,
        yesNo("has_dependents", "Possui dependentes?", "dependents_yes", "dependents_no"),
        text("dependents_details", "Quais dependentes?", { wide: true }),
      ],
    },
    {
      title: "Dados previdenciários",
      fields: [
        text("my_inss_password", "Senha do Meu INSS", {
          type: "password",
          help: "A senha é usada somente neste navegador para gerar o arquivo e não é salva pelo Lexora.",
        }),
        text("nit_pis_pasep", "NIT / PIS / PASEP"),
        checkbox("insured_employee", "Empregado"),
        checkbox("insured_domestic", "Empregado doméstico"),
        checkbox("insured_individual", "Contribuinte individual"),
        checkbox("insured_mei", "MEI"),
        checkbox("insured_rural", "Segurado especial (rural)"),
        checkbox("insured_unemployed", "Desempregado"),
        checkbox("insured_optional", "Facultativo"),
        text("insured_other", "Outro tipo de segurado"),
        yesNo("has_ctps", "Possui carteira de trabalho?", "has_ctps_yes", "has_ctps_no"),
        yesNo("received_benefit", "Recebe ou recebeu benefício?", "received_benefit_yes", "received_benefit_no"),
        text("received_benefit_details", "Qual benefício?"),
        text("benefit_number", "Número do benefício"),
      ],
    },
    {
      title: "Benefício ou serviço envolvido",
      fields: [
        checkbox("benefit_temporary_disability", "Auxílio-doença / incapacidade temporária"),
        checkbox("benefit_permanent_disability", "Aposentadoria por incapacidade permanente"),
        checkbox("benefit_accident", "Auxílio-acidente"),
        checkbox("benefit_bpc_elderly", "BPC / LOAS — idoso"),
        checkbox("benefit_bpc_disability", "BPC / LOAS — deficiência"),
        checkbox("benefit_retirement_contribution", "Aposentadoria por tempo de contribuição"),
        checkbox("benefit_retirement_age", "Aposentadoria por idade"),
        checkbox("benefit_special_retirement", "Aposentadoria especial"),
        checkbox("benefit_hybrid_retirement", "Aposentadoria híbrida"),
        checkbox("benefit_survivor_pension", "Pensão por morte"),
        checkbox("benefit_maternity", "Salário-maternidade"),
        checkbox("service_admin_appeal", "Recurso administrativo"),
        checkbox("service_benefit_review", "Revisão de benefício"),
        checkbox("service_retirement_planning", "Planejamento previdenciário"),
        checkbox("service_inss_calculation", "Cálculo do INSS"),
        checkbox("service_legal_action", "Ação judicial"),
        text("service_other", "Outro serviço"),
      ],
    },
    {
      title: "Histórico laboral",
      fields: [
        yesNo("worked_with_ctps", "Trabalhou com carteira assinada?", "urban_ctps_yes", "urban_ctps_no"),
        text("urban_periods", "Períodos urbanos", { type: "textarea", wide: true }),
        yesNo("was_self_employed", "Trabalhou como autônomo?", "self_employed_yes", "self_employed_no"),
        text("self_employed_activities", "Atividades como autônomo", { wide: true }),
        text("self_employed_periods", "Períodos como autônomo", { wide: true }),
        yesNo("was_mei", "Foi MEI?", "mei_yes", "mei_no"),
        text("mei_start", "Início do MEI", { type: "date" }),
        text("mei_end", "Fim do MEI", { type: "date" }),
        checkbox("rural_not_applicable", "Atividade rural: não se aplica"),
        checkbox("rural_yes", "Exerceu atividade rural"),
        text("rural_activity_type", "Tipo de atividade rural"),
        text("rural_periods", "Períodos rurais", { wide: true }),
        text("rural_property", "Propriedade / área rural", { wide: true }),
        yesNo("has_rural_documents", "Possui documentos da atividade?", "rural_documents_yes", "rural_documents_no"),
      ],
    },
    {
      title: "Documentos apresentados",
      fields: [
        checkbox("doc_rg_cpf", "RG / CPF"), checkbox("doc_address", "Comprovante de residência"),
        checkbox("doc_ctps", "Carteira de trabalho"), checkbox("doc_cnis", "Extrato CNIS"),
        checkbox("doc_contribution_guides", "Guias de contribuição"), checkbox("doc_rural", "Certidões rurais"),
        checkbox("doc_medical", "Laudos e exames médicos"), checkbox("doc_cat", "CAT"),
        checkbox("doc_inss_letters", "Comunicações do INSS"), checkbox("doc_power_attorney", "Procuração"),
        text("doc_other", "Outros documentos"),
      ],
    },
    {
      title: "Caso e situação processual",
      fields: [
        text("case_story", "Relato do cliente", { type: "textarea", wide: true }),
        yesNo("has_admin_request", "Há pedido administrativo?", "admin_request_yes", "admin_request_no"),
        text("admin_protocol", "Número do protocolo"),
        text("request_date", "Data do requerimento", { type: "date" }),
        yesNo("had_medical_exam", "Houve perícia médica?", "medical_exam_yes", "medical_exam_no"),
        {
          name: "medical_result",
          label: "Resultado da perícia",
          type: "select",
          options: [
            { value: "", label: "Não informado" },
            { value: "granted", label: "Deferido", tag: "medical_granted" },
            { value: "denied", label: "Indeferido", tag: "medical_denied" },
          ],
        },
        text("medical_exam_notes", "Observações da perícia", { type: "textarea", wide: true }),
        yesNo("has_judicial_case", "Existe processo judicial?", "judicial_case_yes", "judicial_case_no"),
        text("process_number", "Número do processo"),
        text("court", "Vara / tribunal"),
        text("procedural_stage", "Fase"),
      ],
    },
    {
      title: "Objetivo do cliente",
      fields: [
        checkbox("objective_denied_benefit", "Obter benefício negado"),
        checkbox("objective_new_request", "Entrar com novo pedido"),
        checkbox("objective_appeal", "Entrar com recurso"),
        checkbox("objective_benefit_review", "Revisão de benefício"),
        checkbox("objective_legal_action", "Propor ação judicial"),
        checkbox("objective_retirement_planning", "Planejamento previdenciário"),
        checkbox("objective_retirement_simulation", "Simulação de aposentadoria"),
        text("objective_other", "Outro objetivo"),
      ],
    },
    {
      title: "Avaliação, honorários e parecer",
      fields: [
        text("contribution_time", "Tempo de contribuição identificado"),
        yesNo("waiting_period_met", "Carências cumpridas?", "waiting_period_yes", "waiting_period_no"),
        text("missing_documents", "Documentos faltantes", { type: "textarea", wide: true }),
        {
          name: "success_probability",
          label: "Probabilidade de êxito",
          type: "select",
          options: [
            { value: "", label: "Não informada" },
            { value: "high", label: "Alta", tag: "success_high" },
            { value: "medium", label: "Média", tag: "success_medium" },
            { value: "low", label: "Baixa", tag: "success_low" },
          ],
        },
        text("strategic_notes", "Observações estratégicas", { type: "textarea", wide: true }),
        text("fees_amount", "Valor dos honorários"),
        text("payment_terms", "Forma de pagamento", { wide: true }),
        yesNo("contract_signed", "Contrato assinado?", "contract_signed_yes", "contract_signed_no"),
        yesNo("power_attorney_signed", "Procuração assinada?", "power_attorney_yes", "power_attorney_no"),
        text("administrative_opinion", "Parecer / andamento administrativo", { type: "textarea", wide: true }),
        text("client_signature", "Nome do cliente para assinatura"),
        text("lawyer_signature", "Nome do advogado para assinatura"),
      ],
    },
  ],
};

const laborTemplates = [laborForm, laborDocuments];
const civilTemplates = [civilForm, civilChecklist];
const socialSecurityTemplates = [socialSecurityForm];

export const templatesByArea: Record<string, AreaDocumentTemplate[]> = {
  TRABALHISTA: laborTemplates,
  CIVEL: civilTemplates,
  JUIZADO_CIVEL: civilTemplates,
  VARA_CIVEL: civilTemplates,
  IMOBILIARIO: civilTemplates,
  PREVIDENCIARIO: socialSecurityTemplates,
  FEDERAL: socialSecurityTemplates,
};
