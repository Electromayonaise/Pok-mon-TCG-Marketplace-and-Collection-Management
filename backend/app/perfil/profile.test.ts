// The seller profile's display rules (page 11.2; Story 13.5): the page formats the server's figures and computes none.
import { describe, expect, it } from 'vitest';
import { averageLabel, countLabel, profilePage, provenanceLabel, reviewDate, stars, starsOfTenths } from './profile.js';

describe('the profile summary (page 11.2, microcopy §9)', () => {
  it('formats integer tenths with a decimal comma and fills round(average) of five stars', () => {
    expect([averageLabel(43), averageLabel(50), averageLabel(10)]).toEqual(['4,3', '5,0', '1,0']);
    expect([starsOfTenths(43), starsOfTenths(45), starsOfTenths(10)]).toEqual(['★★★★☆', '★★★★★', '★☆☆☆☆']);
    expect([stars(-1), stars(9)]).toEqual(['☆☆☆☆☆', '★★★★★']);
  });

  it('names the count and the provenance of each seller kind', () => {
    expect([countLabel(1), countLabel(12)]).toEqual(['1 reseña', '12 reseñas']);
    expect([provenanceLabel('business'), provenanceLabel('individual')]).toEqual(['De compras verificadas', 'Las reseñas no están ligadas a compras']);
  });

  it('dates a review in Bogotá, and reads ?pagina= as 1–1,000 or the first page', () => {
    expect(reviewDate('2026-10-10T03:00:00.000Z')).toMatch(/^9 oct 2026$/);
    expect([profilePage('2'), profilePage(undefined), profilePage('0'), profilePage('1001'), profilePage('-3'), profilePage(['2'])]).toEqual([2, 1, 1, 1, 1, 1]);
  });
});
