// The binder pages' own rules (page 9.1, Story 11.5): the `?orden=` and `?pagina=` parameters, the source badge of a
// pocket (microcopy-es-CO.md §8) and the https-only image rule (S-12). Pure: the page renders what these return.
import { describe, expect, it } from 'vitest';
import type { BinderEntryDTO } from '../../src/modules/collections/index.js';
import { pageFromQuery, safeImage, sortFromQuery, sourceBadge } from './binder.js';

const pocket = (o: Partial<BinderEntryDTO> = {}): BinderEntryDTO => ({
  entryId: 'e1x000000000000000000000', cardKind: 'catalog', catalogEntryId: 'charx0000000000000000000', title: 'Charizard ex', source: 'Manual', qty: 1,
  acquiredAt: '2026-09-01', manualPosition: 0, externalUrl: null, imageUrl: null, orderId: null, ...o,
});

describe('the binder URL parameters (?orden=, ?pagina=)', () => {
  it('?orden= keeps up to 3 distinct known keys in order; anything else falls back to the manual order', () => {
    expect(sortFromQuery('name,acquiredAt')).toEqual(['name', 'acquiredAt']);
    expect(sortFromQuery('name,name,setNumber,acquiredAt,acquiredPriceCop')).toEqual(['name', 'setNumber', 'acquiredAt']);
    expect(sortFromQuery(['setNumber', 'name'])).toEqual(['setNumber']);
    expect([sortFromQuery(undefined), sortFromQuery(''), sortFromQuery('precio,DROP TABLE')]).toEqual([['manual'], ['manual'], ['manual']]);
  });

  it('?pagina= is a whole page number from 1; anything else is page 1', () => {
    expect([pageFromQuery('2'), pageFromQuery(['3', '9'])]).toEqual([2, 3]);
    expect([pageFromQuery(undefined), pageFromQuery('0'), pageFromQuery('-1'), pageFromQuery('1.5'), pageFromQuery('dos'), pageFromQuery('1e400')]).toEqual([1, 1, 1, 1, 1, 1]);
  });
});

describe('a pocket\'s badge and image (microcopy §8, S-12)', () => {
  it('names how the card got there: bought on TEZG, added by hand, or added by a link with its host', () => {
    expect(sourceBadge(pocket({ source: 'PlatformPurchase', orderId: 'o1x000000000000000000000' }))).toBe('Comprado en TEZG');
    expect(sourceBadge(pocket())).toBe('Agregado a mano');
    expect(sourceBadge(pocket({ cardKind: 'external', catalogEntryId: null, externalUrl: 'https://promos.example/pikachu?x=1' }))).toBe('Agregado por enlace · promos.example');
    expect(sourceBadge(pocket({ cardKind: 'external', catalogEntryId: null, externalUrl: null }))).toBe('Agregado por enlace · ');
  });

  it('puts only an https image in the page', () => {
    expect(safeImage('https://img.example/a.png')).toBe('https://img.example/a.png');
    expect([safeImage('http://img.example/a.png'), safeImage('javascript:alert(1)'), safeImage('//img.example/a.png'), safeImage(null)]).toEqual([null, null, null, null]);
  });
});
