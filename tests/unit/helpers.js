import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseDataset } from '../../src/data/load.js';
import { buildModel } from '../../src/data/model.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

/** The real dataset from data/ (read-only). */
export function loadRealRaw() {
  const read = (f) => readFileSync(join(dataDir, f), 'utf8');
  return {
    ...parseDataset({ norms: read('norms.csv'), entities: read('entities.csv'), links: read('links.csv') }),
    meta: JSON.parse(read('meta.json')),
  };
}

export function loadRealModel() {
  return buildModel(loadRealRaw());
}

/** Small in-memory fixture, CSV text in the same shape as the real files. */
export const FIXTURE = {
  norms: `norm_id,title,label,orientation
A,Alpha,Norm A: Alpha,positive
C,Gamma,Norm C: Gamma,prohibitive
`,
  entities: `entity_id,name,short_name,type,aliases
cra,Cyber Resilience Act (Regulation 2024/2847),CRA,Legislation,
dem,European Democracy Action Plan,,Policies,
cafe,Café Cooperation Network,,Partnerships,Cafe Net; CCN
`,
  links: `link_id,norm_id,operationalization,entity_id,topic_primary,topic_secondary,job_primary,job_secondary
1,A,Op one,cra,Incident response and management,Stability and security,Incident manager,Diplomat
2,A,Op two,dem,Stability and security,,Diplomat,
3,C,Op three,cafe,Critical infrastructure,Incident response and management,Critical infrastructure actor,Incident manager
4,C,Op three,cra,Supply chain security,,Threat analyst,
`,
};

export function fixtureRaw(overrides = {}) {
  return { ...parseDataset({ ...FIXTURE, ...overrides }), meta: { version: null, date: null, source_report_version: null, licence: null, citation: null, contact: null } };
}
