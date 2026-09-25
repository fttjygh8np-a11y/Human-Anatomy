import { describe, expect, it } from 'vitest'
import { assignPrinted, normalizeForQuote, pagesOfLocator, printedNumberOf, quoteOccurs } from './iuc.ts'

describe('İÜC page helpers', () => {
  it('reads the printed page number from the first line', () => {
    expect(printedNumberOf('5\nCC BY 4.0: …')).toBe(5)
    expect(printedNumberOf('BÖLÜM 1.1\nSKELETON')).toBeNull()
    expect(printedNumberOf('IV\nİÇİNDEKİLER')).toBeNull()
  })

  it('infers numbers of unnumbered pages from the common offset', () => {
    const pages = assignPrinted([
      { pdfPage: 13, text: '3\nmetin' },
      { pdfPage: 14, text: 'BÖLÜM 1.1' },
      { pdfPage: 15, text: '5\nmetin' },
      { pdfPage: 2, text: '' },
    ])
    expect(pages.map((p) => p.printed)).toEqual([3, 4, 5, null])
  })

  it('normalises hyphenation, reference-number lines, quotes and whitespace', () => {
    const raw = 'Bu kemikler uzuv-\nlarımızı oluştururlar.\n1, 2, 3, 4,\nskapulanın acromion’u ile'
    expect(normalizeForQuote(raw)).toBe("Bu kemikler uzuvlarımızı oluştururlar. skapulanın acromion'u ile")
  })

  it('parses page numbers and ranges from locators', () => {
    expect(pagesOfLocator('Bölüm 1.1, s. 5')).toEqual([5])
    expect(pagesOfLocator('s. 5-7')).toEqual([5, 6, 7])
    expect(pagesOfLocator('Bölüm 1.1')).toEqual([])
    expect(pagesOfLocator(undefined)).toEqual([])
  })

  it('finds quotes on the named pages only, across page breaks and with omissions', () => {
    const pages = assignPrinted([
      { pdfPage: 1, text: '5\nClavicula (Köprücük kemiği): Yatay bir S harfi şeklinde-' },
      { pdfPage: 2, text: '6\ndir; medial 2/3’ü öne doğru dışbükeydir.' },
      { pdfPage: 3, text: '7\nScapula üçgen şeklindedir.' },
    ])
    expect(quoteOccurs(pages, [5], 'Yatay bir S harfi')).toBe(true)
    expect(quoteOccurs(pages, [5, 6], 'Yatay bir S harfi şeklindedir; medial')).toBe(true)
    expect(quoteOccurs(pages, [5, 6], "Clavicula (Köprücük kemiği): … medial 2/3'ü öne doğru dışbükeydir.")).toBe(true)
    expect(quoteOccurs(pages, [5], 'Scapula üçgen')).toBe(false)
    expect(quoteOccurs(pages, [7], 'Scapula dörtgen')).toBe(false)
  })
})
