import { describe, expect, it } from 'vitest'
import { assignPrinted, normalizeForQuote, pagesOfLocator, parseMuscleBlocks, printedNumberOf, quoteOccurs, splitSentences } from './iuc.ts'

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

describe('splitSentences', () => {
  it('splits at sentence ends before a capital letter only (not inside numbers or before lower-case abbreviations)', () => {
    expect(splitSentences('Karaciğer en büyük bezdir. Oranı %2.5 kadardır. Lig. teres ile bağlanır; a. hepatica dalları. Sonra!')).toEqual([
      'Karaciğer en büyük bezdir.',
      'Oranı %2.5 kadardır.',
      'Lig. teres ile bağlanır; a. hepatica dalları.',
      'Sonra!',
    ])
  })
})

describe('parseMuscleBlocks', () => {
  const lines = (texts: string[], page = 70) => texts.map((text) => ({ text, page }))

  it('reads labelled fields, continuation lines and an unlabelled first sentence', () => {
    const [b] = parseMuscleBlocks(
      lines([
        'M. teres minor:',
        'Omuz ekleminin arkasındaki küçük kastır.',
        'Başlangıcı: Scapula’nın margo lateralis’inin 2/3',
        'üst parçasından başlar.',
        'Sonlanışı: Tuberculum majus’un en alt kısmında sonlanır.',
        'İşlevi: Kola dışa rotasyon yaptırır.',
        'Siniri: N. axillaris’tir.',
      ]),
    )
    expect(b!.name).toBe('teres minor')
    expect(b!.fields.map((f) => [f.label, f.lines.length])).toEqual([
      ['summary', 1],
      ['Başlangıcı', 2],
      ['Sonlanışı', 1],
      ['İşlevi', 1],
      ['Siniri', 1],
    ])
  })

  it('ends a field at reference-number lines and headings, and starts a new block per muscle', () => {
    const blocks = parseMuscleBlocks(lines(['Mm. intercostales externi: Kaburgalar arasındadır.', '12, 13', 'Dağınık satır', 'M. subclavius:', 'Siniri: N. subclavius’tur.']))
    expect(blocks.map((b) => b.name)).toEqual(['intercostales externi', 'subclavius'])
    expect(blocks[0]!.fields).toHaveLength(1)
    expect(blocks[0]!.fields[0]!.lines.map((l) => l.text)).toEqual(['Kaburgalar arasındadır.'])
  })
})
