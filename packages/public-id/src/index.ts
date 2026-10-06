export const PUBLIC_ID_PREFIXES = {
  ORG: 'ORG',
  USER: 'USER',
  PROJ: 'PROJ',
  PROP: 'PROP',
  COM: 'COM',
  DEV: 'DEV',
  AGT: 'AGT',
  REQ: 'REQ',
  LEAD: 'LEAD',
  DOC: 'DOC',
  SUB: 'SUB',
  PAY: 'PAY',
  REV: 'REV',
  MED: 'MED',
  CONTACT: 'CONTACT',
  ACT: 'ACT',
  TASK: 'TASK',
  VISIT: 'VISIT',
  DEAL: 'DEAL',
  PLAN: 'PLAN',
  WAL: 'WAL',
  WLED: 'WLED',
  INV: 'INV',
  REF: 'REF',
  LPUR: 'LPUR',
  VCASE: 'VCASE',
  VDOC: 'VDOC',
  RRPT: 'RRPT',
  NTF: 'NTF',
  CONV: 'CONV',
  MSG: 'MSG',
  LACC: 'LACC',
  CRPT: 'CRPT',
  MSNAP: 'MSNAP',
  INFRA: 'INFRA',
  IOBS: 'IOBS',
  AIJOB: 'AIJOB',
  DOCA: 'DOCA',
  FPA: 'FPA',
  VAL: 'VAL',
  CRT: 'CRT',
  EDC: 'EDC',
  EDCR: 'EDCR',
  MCOL: 'MCOL',
  MCIT: 'MCIT',
  MAEV: 'MAEV',
  EMAP: 'EMAP',
  BCFG: 'BCFG',
} as const;

export type PublicIdPrefix = (typeof PUBLIC_ID_PREFIXES)[keyof typeof PUBLIC_ID_PREFIXES];

export const PUBLIC_ID_MIN_PAD = 6;

const PUBLIC_ID_PATTERN = /^PS-([A-Z]+)-(\d+)$/;

export type ParsedPublicId = {
  prefix: string;
  number: number;
  formatted: string;
};

export function formatPublicId(prefix: PublicIdPrefix | string, value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Public ID number must be a positive integer');
  }

  const normalizedPrefix = prefix.toUpperCase();
  const digits = String(value);
  const padded =
    digits.length >= PUBLIC_ID_MIN_PAD ? digits : digits.padStart(PUBLIC_ID_MIN_PAD, '0');
  return `PS-${normalizedPrefix}-${padded}`;
}

export function parsePublicId(publicId: string): ParsedPublicId {
  const match = PUBLIC_ID_PATTERN.exec(publicId);
  if (!match) {
    throw new Error(`Invalid public ID: ${publicId}`);
  }

  const prefix = match[1];
  const numberPart = match[2];
  if (!prefix || !numberPart) {
    throw new Error(`Invalid public ID: ${publicId}`);
  }

  const number = Number(numberPart);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`Invalid public ID number: ${publicId}`);
  }

  return {
    prefix,
    number,
    formatted: formatPublicId(prefix, number),
  };
}

export function isValidPublicId(publicId: string): boolean {
  try {
    parsePublicId(publicId);
    return true;
  } catch {
    return false;
  }
}

/** Sequence names used by the API for concurrency-safe public ID allocation. */
export const PUBLIC_ID_SEQUENCES: Record<
  | 'USER'
  | 'ORG'
  | 'DEV'
  | 'AGT'
  | 'PROJ'
  | 'PROP'
  | 'COM'
  | 'MED'
  | 'DOC'
  | 'REQ'
  | 'LEAD'
  | 'CONTACT'
  | 'ACT'
  | 'TASK'
  | 'VISIT'
  | 'DEAL'
  | 'PLAN'
  | 'SUB'
  | 'WAL'
  | 'WLED'
  | 'PAY'
  | 'INV'
  | 'REF'
  | 'LPUR'
  | 'VCASE'
  | 'VDOC'
  | 'REV'
  | 'RRPT'
  | 'NTF'
  | 'CONV'
  | 'MSG'
  | 'LACC'
  | 'CRPT'
  | 'MSNAP'
  | 'INFRA'
  | 'IOBS'
  | 'AIJOB'
  | 'DOCA'
  | 'FPA'
  | 'VAL'
  | 'CRT'
  | 'EDC'
  | 'EDCR'
  | 'MCOL'
  | 'MCIT'
  | 'MAEV'
  | 'EMAP'
  | 'BCFG',
  string
> = {
  USER: 'public_id_user_seq',
  ORG: 'public_id_org_seq',
  DEV: 'public_id_dev_seq',
  AGT: 'public_id_agt_seq',
  PROJ: 'public_id_proj_seq',
  PROP: 'public_id_prop_seq',
  COM: 'public_id_com_seq',
  MED: 'public_id_med_seq',
  DOC: 'public_id_doc_seq',
  REQ: 'public_id_req_seq',
  LEAD: 'public_id_lead_seq',
  CONTACT: 'public_id_contact_seq',
  ACT: 'public_id_act_seq',
  TASK: 'public_id_task_seq',
  VISIT: 'public_id_visit_seq',
  DEAL: 'public_id_deal_seq',
  PLAN: 'public_id_plan_seq',
  SUB: 'public_id_sub_seq',
  WAL: 'public_id_wal_seq',
  WLED: 'public_id_wled_seq',
  PAY: 'public_id_pay_seq',
  INV: 'public_id_inv_seq',
  REF: 'public_id_ref_seq',
  LPUR: 'public_id_lpur_seq',
  VCASE: 'public_id_vcase_seq',
  VDOC: 'public_id_vdoc_seq',
  REV: 'public_id_rev_seq',
  RRPT: 'public_id_rrpt_seq',
  NTF: 'public_id_ntf_seq',
  CONV: 'public_id_conv_seq',
  MSG: 'public_id_msg_seq',
  LACC: 'public_id_lacc_seq',
  CRPT: 'public_id_crpt_seq',
  MSNAP: 'public_id_msnap_seq',
  INFRA: 'public_id_infra_seq',
  IOBS: 'public_id_iobs_seq',
  AIJOB: 'public_id_aijob_seq',
  DOCA: 'public_id_doca_seq',
  FPA: 'public_id_fpa_seq',
  VAL: 'public_id_val_seq',
  CRT: 'public_id_crt_seq',
  EDC: 'public_id_edc_seq',
  EDCR: 'public_id_edcr_seq',
  MCOL: 'public_id_mcol_seq',
  MCIT: 'public_id_mcit_seq',
  MAEV: 'public_id_maev_seq',
  EMAP: 'public_id_emap_seq',
  BCFG: 'public_id_bcfg_seq',
};
