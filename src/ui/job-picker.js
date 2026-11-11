// JobPicker (S2): six chips with primary · primary+secondary counts. Same `job` criterion as the dropdown.
import { JOB_NOT_SPECIFIED } from '../config.js';
import { h, fmt } from './dom.js';
import { jobLensCounts } from '../logic/aggregate.js';
import { orderedJobs, shortJob } from '../logic/view.js';

export function createJobPicker(ctx) {
  const { model, copy, store, facts } = ctx;
  const jobs = orderedJobs(model);
  const counts = jobLensCounts(model.links, jobs);
  const chips = new Map();

  const el = h('section', { class: 'job-picker', 'aria-labelledby': 'job-picker-h' },
    h('h2', { class: 'job-picker__heading', id: 'job-picker-h' }, copy.jobPicker.heading),
    h('p', { class: 'small' }, copy.jobPicker.explain),
    h('div', { class: 'job-picker__chips' },
      jobs.map((j) => {
        const c = counts.get(j);
        const b = h('button', {
          type: 'button',
          class: `job-chip${j === JOB_NOT_SPECIFIED ? ' job-chip--muted' : ''}`,
          'aria-pressed': 'false',
          'aria-label': `${j}: ${c.primary} links as main job category, ${c.withSecondary} as main or secondary`,
          onClick: () => store.set({ job: store.get().job === j ? '' : j, by: 'job' }),
        }, h('span', { class: 'job-chip__name' }, shortJob(j)), h('span', { class: 'job-chip__count' }, `${c.primary} · ${c.withSecondary}`));
        chips.set(j, b);
        return b;
      })),
    jobs.includes(JOB_NOT_SPECIFIED) ? h('p', { class: 'small muted' }, `${JOB_NOT_SPECIFIED}: ${fmt(copy.jobPicker.notSpecifiedNote, facts)}`) : null,
  );

  return {
    el,
    update(state) {
      for (const [j, b] of chips) b.setAttribute('aria-pressed', String(state.job === j));
    },
  };
}
